import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import * as cheerio from 'cheerio';
import multer from 'multer';
import XLSX from 'xlsx';

// Multer config for Excel uploads (memory storage, max 5MB)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel (.xlsx, .xls) ou CSV são permitidos'));
    }
  }
});

const router = express.Router();

// ===================== MIDDLEWARE: Verificar se usuário é agência =====================
const requireAgency = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT is_agency FROM users WHERE id = $1 AND type = $2',
      [req.user.id, 'company']
    );
    if (result.rows.length === 0 || !result.rows[0].is_agency) {
      return res.status(403).json({ error: 'Acesso restrito a agências de estágio', code: 'NOT_AGENCY' });
    }
    next();
  } catch (e) {
    console.error('Erro verificando agência:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ===================== LAZY MIGRATION =====================
let ensuredAgencyJobColumns = false;
const ensureAgencyJobColumns = async () => {
  if (ensuredAgencyJobColumns) return;
  try {
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_agency_job BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url TEXT');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES users(id) ON DELETE SET NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_jobs_is_agency_job ON jobs(is_agency_job)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON jobs(agency_id)');
    ensuredAgencyJobColumns = true;
  } catch (e) {
    console.error('Erro garantindo colunas de agência em jobs:', e.message);
  }
};

// ===================== SCRAPE URL =====================

// POST /api/agency/scrape-url - Tenta extrair informações de uma vaga a partir de uma URL
router.post('/scrape-url', [
  authenticateToken,
  requireAgency,
  body('url').notEmpty().isURL().withMessage('URL válida é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url } = req.body;
    console.log('[agency-scrape] Tentando extrair dados de:', url);

    // ==================== SELECTY API STRATEGY ====================
    // Selecty sites (*.selecty.com.br) are SPAs with an internal API at /backend/vacancy/read?id=X
    // We detect the job ID from the URL and call the API directly for complete data.
    const selectyMatch = url.match(/selecty\.com\.br\/vaga\/(\d+)/i);
    if (selectyMatch) {
      const vacancyId = selectyMatch[1];
      const urlObj = new URL(url);
      const selectyOrigin = urlObj.origin;
      console.log('[agency-scrape] Selecty detected! Vacancy ID:', vacancyId, '| Origin:', selectyOrigin);

      try {
        // Step 1: Get session cookie + CSRF token from the page
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        });
        const pageHtml = await pageRes.text();
        const setCookies = pageRes.headers.getSetCookie?.() || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
        const csrfMatch = pageHtml.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
        const csrf = csrfMatch ? csrfMatch[1] : '';
        const xsrfCookie = setCookies.find(c => c.startsWith('XSRF-TOKEN='));
        const xsrfValue = xsrfCookie ? decodeURIComponent(xsrfCookie.split('=')[1].split(';')[0]) : '';

        // Step 2: Call the internal API
        const apiUrl = `${selectyOrigin}/backend/vacancy/read?id=${vacancyId}`;
        console.log('[agency-scrape] Calling Selecty API:', apiUrl);
        const apiRes = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Cookie': cookieStr,
            'X-CSRF-TOKEN': csrf,
            'X-XSRF-TOKEN': xsrfValue,
            'Referer': url
          }
        });

        if (apiRes.ok) {
          const contentType = apiRes.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            const data = await apiRes.json();
            console.log('[agency-scrape] Selecty API success! Fields:', Object.keys(data));

            // Get company name from page title (Selecty doesn't include it in API)
            const $ = cheerio.load(pageHtml);
            const pageTitle = $('title').text().trim();
            const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';

            // Parse salary
            let salary_min = null, salary_max = null;
            if (data.salary) {
              const salMatch = data.salary.match(/R\$\s*([\d.,]+)/);
              if (salMatch) {
                salary_min = parseFloat(salMatch[1].replace(/\./g, '').replace(',', '.'));
              }
              const rangeMatch = data.salary.match(/R\$\s*([\d.,]+)\s*(?:a|até|-|–)\s*R\$\s*([\d.,]+)/);
              if (rangeMatch) {
                salary_min = parseFloat(rangeMatch[1].replace(/\./g, '').replace(',', '.'));
                salary_max = parseFloat(rangeMatch[2].replace(/\./g, '').replace(',', '.'));
              }
            }

            // Parse contract type
            let contract_type = '';
            const contractArr = data.contract_type || [];
            const contractStr = (Array.isArray(contractArr) ? contractArr.join(' ') : String(contractArr)).toLowerCase();
            if (contractStr.includes('estágio') || contractStr.includes('estagio') || contractStr.includes('intern')) contract_type = 'estagio';
            else if (contractStr.includes('clt')) contract_type = 'clt';
            else if (contractStr.includes('pj') || contractStr.includes('pessoa jurídica')) contract_type = 'pj';
            else if (contractStr.includes('temporário') || contractStr.includes('temporario')) contract_type = 'temporario';

            // Parse work type
            let work_type = '';
            const workplaceStr = (data.workplace_type || '').toLowerCase();
            if (workplaceStr.includes('remoto') || workplaceStr.includes('home office')) work_type = 'remoto';
            else if (workplaceStr.includes('híbrido') || workplaceStr.includes('hibrido')) work_type = 'hibrido';
            else if (workplaceStr.includes('presencial')) work_type = 'presencial';

            // Build location
            const location = [data.city, data.state].filter(Boolean).join(', ');

            // Build enriched description
            let description = data.activities || '';
            const extras = [];
            if (data.interest_area) extras.push(`Área profissional: ${data.interest_area}`);
            if (data.workload) extras.push(`Carga horária: ${data.workload}`);
            if (data.work_schedule) extras.push(`Jornada: ${data.work_schedule}`);
            if (data.salary) extras.push(`Salário: ${data.salary}`);
            if (data.benefits) extras.push(`Benefícios: ${data.benefits}`);
            if (data.workplace_complement) extras.push(`Complemento: ${data.workplace_complement}`);
            if (extras.length > 0) {
              description = (description ? description + '\n\n' : '') + extras.join('\n');
            }

            const result = {
              title: data.occupation || '',
              company_name: pageTitle || ogSiteName || '',
              location,
              description,
              requirements: data.requirements || '',
              contract_type,
              work_type,
              salary_min,
              salary_max,
              salary_text: data.salary || ''
            };

            // Remove empty/null values
            Object.keys(result).forEach(k => { if (!result[k]) delete result[k]; });
            const fieldsFound = Object.keys(result);
            console.log('[agency-scrape] Selecty result:', fieldsFound, '| Title:', result.title, '| Company:', result.company_name);

            return res.json({
              success: fieldsFound.length >= 1,
              message: `Dados completos extraídos via API Selecty (${fieldsFound.length} campos). Revise e ajuste se necessário.`,
              data: result,
              isSPA: false
            });
          }
        }
        console.log('[agency-scrape] Selecty API failed, falling back to HTML scraping');
      } catch (selectyErr) {
        console.error('[agency-scrape] Selecty API error:', selectyErr.message);
        // Fall through to generic HTML scraping
      }
    }

    // ==================== GENERIC HTML SCRAPING (fallback) ====================
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let html;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        }
      });
      clearTimeout(timeout);
      html = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error('[agency-scrape] Erro ao buscar URL:', fetchErr.message);
      return res.json({
        success: false,
        message: 'Não foi possível acessar a URL. Verifique se o link está correto.',
        data: {}
      });
    }

    const $ = cheerio.load(html);

    // ==================== SMART EXTRACTION STRATEGIES ====================
    // Many job sites (like Selecty) are SPAs that render content via JavaScript.
    // The static HTML may only contain meta tags and an empty shell.
    // We detect this and use meta tags + URL parsing as primary strategy.
    
    const bodyText = $('body').text();
    const bodyTextLower = bodyText.toLowerCase();
    const norm = (s) => s ? s.replace(/\s+/g, ' ').trim() : '';
    
    // Detect if site is a SPA (very little text content)
    const isLikelySPA = bodyText.replace(/\s+/g, '').length < 200;
    console.log('[agency-scrape] HTML size:', html.length, '| Body text length:', bodyText.length, '| SPA detected:', isLikelySPA);

    // ==================== META TAG EXTRACTION (works for SPAs) ====================
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const pageTitle = $('title').text().trim();
    
    console.log('[agency-scrape] OG tags:', { ogTitle, ogDescription: ogDescription.substring(0, 50), ogSiteName, pageTitle });

    // ==================== URL PARSING (extract data from URL slug) ====================
    // URLs like: /vaga/269311/vaga-para-projetista-em-campo-grande-ms-brasil
    const urlData = { title: '', location: '', city: '', state: '' };
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      // Find slug part (usually last segment with dashes)
      const slug = pathParts.find(p => p.includes('-') && p.length > 10) || pathParts[pathParts.length - 1] || '';
      
      if (slug) {
        // Pattern: vaga-para-{title}-em-{city}-{state}(-brasil)
        const vagaMatch = slug.match(/^vaga-(?:para|de)-(.+?)-em-(.+)$/i);
        if (vagaMatch) {
          urlData.title = vagaMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const locationPart = vagaMatch[2].replace(/-brasil$/, '').trim();
          // Try to separate city and state (last 2-char segment is state)
          const locParts = locationPart.split('-');
          if (locParts.length >= 2) {
            const lastPart = locParts[locParts.length - 1].toUpperCase();
            // Brazilian state codes are 2 letters
            if (lastPart.length === 2 && /^[A-Z]{2}$/.test(lastPart)) {
              urlData.state = lastPart;
              urlData.city = locParts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
              urlData.location = `${urlData.city}, ${urlData.state}`;
            } else {
              urlData.location = locParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            }
          } else {
            urlData.location = locationPart.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
        } else {
          // Generic slug parsing: just use the slug as title hint
          const cleanSlug = slug.replace(/^vaga-|-\d+$/g, '').replace(/-/g, ' ');
          if (cleanSlug.length > 3) {
            urlData.title = cleanSlug.replace(/\b\w/g, c => c.toUpperCase());
          }
        }
      }
      console.log('[agency-scrape] URL data:', urlData);
    } catch (e) {
      console.log('[agency-scrape] URL parsing failed:', e.message);
    }

    // ==================== TITLE ====================
    let title = '';
    // Priority 1: OG title (most reliable for SPAs) — clean it
    if (ogTitle) {
      // Clean common patterns like "Vaga para X em City - State - Brasil"
      let cleaned = ogTitle;
      // Remove "Vaga para " or "Vaga de " prefix
      cleaned = cleaned.replace(/^Vaga\s+(para|de)\s+/i, '');
      // Remove location suffix: " em City - UF - Brasil" or " em City - UF"
      cleaned = cleaned.replace(/\s+em\s+[A-ZÀ-Úa-zà-ú\s]+\s*-\s*[A-Z]{2}(\s*-\s*Brasil)?$/i, '');
      if (cleaned.length > 2) title = cleaned;
    }
    // Priority 2: headings from rendered content
    if (!title) {
      for (const tag of ['h3', 'h1', 'h2']) {
        const el = $(tag).first().text().trim();
        if (el && el.length > 2 && el.length < 200) { title = el; break; }
      }
    }
    // Priority 3: URL slug
    if (!title && urlData.title) {
      title = urlData.title;
    }
    // Priority 4: page title (cleaned)
    if (!title && pageTitle) {
      title = pageTitle.split(/\s*[-|–]\s*/)[0].trim();
    }
    title = title.replace(/^vaga\s+(para|de)\s+/i, '').trim();
    if (title.length > 200) title = title.substring(0, 200);

    // ==================== COMPANY NAME ====================
    let company_name = '';
    // Priority 1: headings (h5 for Selecty, etc.)
    for (const tag of ['h5', 'h4']) {
      const el = $(tag).first().text().trim();
      if (el && el.length > 1 && el.length < 200) { company_name = el; break; }
    }
    // Priority 2: CSS selectors
    if (!company_name) {
      const companySelectors = [
        '.company-name', '.empresa', '.employer-name', '[data-testid="company-name"]',
        '.job-company', '.company', '.nome-empresa', '[itemprop="hiringOrganization"]'
      ];
      for (const sel of companySelectors) {
        const el = $(sel).first();
        if (el.length) {
          const text = el.text().trim();
          if (text && text.length > 1 && text.length < 200) { company_name = text; break; }
        }
      }
    }
    // Priority 3: og:site_name or page title
    if (!company_name && ogSiteName) {
      company_name = ogSiteName;
    }
    if (!company_name && pageTitle) {
      company_name = pageTitle;
    }
    // Priority 4: hostname
    if (!company_name) {
      try { company_name = new URL(url).hostname.replace('www.', '').split('.')[0]; } catch {}
    }

    // ==================== LOCATION ====================
    let location = '';
    // Priority 1: Extract from OG title ("... em Campo Grande - MS - Brasil")
    if (ogTitle) {
      const ogLocMatch = ogTitle.match(/em\s+([A-ZÀ-Úa-zà-ú\s]+?)\s*-\s*([A-Z]{2})(?:\s*-\s*Brasil)?\s*$/i);
      if (ogLocMatch) {
        location = `${ogLocMatch[1].trim()}, ${ogLocMatch[2].toUpperCase()}`;
      }
    }
    // Priority 2: URL slug location
    if (!location && urlData.location) {
      location = urlData.location;
    }
    // Priority 3: body text regex
    if (!location) {
      const locRegex = /(?:local|localização|cidade)\s*[:：]\s*([^\n•\r]+)/i;
      const locMatch = bodyText.match(locRegex);
      if (locMatch) location = norm(locMatch[1]);
    }
    // Priority 4: Brazilian city pattern in body text
    if (!location) {
      const brCityPattern = /\b([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)\s*[,]\s*([A-Z]{2})(?:\s*[-–]\s*Brasil)?\b/;
      const cityMatch = bodyText.match(brCityPattern);
      if (cityMatch) location = `${cityMatch[1]}, ${cityMatch[2]}`;
    }
    // Priority 5: CSS selectors
    if (!location) {
      const locSelectors = ['.job-location', '.location', '.local', '[itemprop="jobLocation"]', '.city'];
      for (const sel of locSelectors) {
        const el = $(sel).first();
        if (el.length) {
          const text = el.text().trim();
          if (text && text.length > 2 && text.length < 150) { location = text; break; }
        }
      }
    }
    if (location.length > 200) location = location.substring(0, 200);

    // ---- STRUCTURED DATA from "Dados da vaga" section (Selecty pattern) ----
    // Find sections by heading text and extract key-value pairs
    const extractSectionContent = (headingTexts) => {
      let content = '';
      $('h1, h2, h3, h4, h5, h6, strong, b, .section-title, .card-header, dt').each((_, el) => {
        const elText = $(el).text().trim().toLowerCase();
        for (const ht of headingTexts) {
          if (elText.includes(ht.toLowerCase())) {
            // Get all following siblings / next elements until next heading
            let current = $(el).next();
            let collected = [];
            // Also try parent's next sibling (some sites wrap heading in a div)
            if (!current.length) {
              current = $(el).parent().next();
            }
            while (current.length) {
              const tag = current.prop('tagName');
              if (tag && /^H[1-6]$/i.test(tag)) break; // stop at next heading
              const cText = current.text().trim();
              if (cText) collected.push(cText);
              current = current.next();
              if (collected.length > 10) break; // safety
            }
            if (collected.length > 0) {
              content = collected.join('\n');
              return false; // break .each
            }
            // Fallback: try parent's text after the heading
            const parentText = $(el).parent().text();
            const afterHeading = parentText.split($(el).text())[1];
            if (afterHeading && afterHeading.trim().length > 10) {
              content = afterHeading.trim();
              return false;
            }
          }
        }
      });
      return norm(content);
    };

    // Extract "Dados da vaga" block for structured key-value pairs
    const dadosSection = extractSectionContent(['Dados da vaga', 'Informações da vaga', 'Detalhes da vaga', 'Job details']);

    // ---- SALARY ----
    let salary_min = null;
    let salary_max = null;
    let salary_text = '';
    // Strategy 1: regex from "Dados da vaga" or full page — "Salário: R$ 1.000,00"
    const salaryPatterns = [
      /sal[aá]rio\s*[:：]\s*R?\$?\s*([\d.,]+)/i,
      /remunera[çc][aã]o\s*[:：]\s*R?\$?\s*([\d.,]+)/i,
      /bolsa\s*[:：]\s*R?\$?\s*([\d.,]+)/i,
      /R\$\s*([\d.,]+)\s*(?:a|até|-|–)\s*R\$\s*([\d.,]+)/i,
      /de\s+R\$\s*([\d.,]+)\s+(?:a|até)\s+R\$\s*([\d.,]+)/i
    ];
    const textForSalary = dadosSection || bodyText;
    for (const pat of salaryPatterns) {
      const m = textForSalary.match(pat);
      if (m) {
        const parseBR = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));
        if (m[2]) {
          salary_min = parseBR(m[1]);
          salary_max = parseBR(m[2]);
          salary_text = `R$ ${m[1]} a R$ ${m[2]}`;
        } else {
          salary_min = parseBR(m[1]);
          salary_text = `R$ ${m[1]}`;
        }
        break;
      }
    }
    // Also try CSS selectors
    if (!salary_text) {
      const salarySelectors = ['.salary', '.salario', '.compensation', '.remuneracao', '[itemprop="baseSalary"]', '.job-salary', '.faixa-salarial'];
      for (const sel of salarySelectors) {
        const el = $(sel).first();
        if (el.length) { salary_text = el.text().trim(); break; }
      }
    }

    // ---- CONTRACT TYPE ----
    let contract_type = '';
    // Strategy 1: from "Dados da vaga" structured text — "Tipo de contratação: Estágio"
    const contractMatch = (dadosSection || bodyText).match(/tipo\s+de\s+contrata[çc][aã]o\s*[:：]\s*([^\n•]+)/i);
    if (contractMatch) {
      const ct = contractMatch[1].trim().toLowerCase();
      if (ct.includes('estágio') || ct.includes('estagio') || ct.includes('intern')) contract_type = 'estagio';
      else if (ct.includes('clt')) contract_type = 'clt';
      else if (ct.includes('pj') || ct.includes('pessoa jurídica')) contract_type = 'pj';
      else if (ct.includes('temporário') || ct.includes('temporario')) contract_type = 'temporario';
    }
    // Strategy 2: fallback — scan page text
    if (!contract_type) {
      const contractContext = bodyTextLower;
      if (contractContext.includes('tipo de contratação: estágio') || contractContext.includes('tipo de contratação:estágio')) contract_type = 'estagio';
      else if (contractContext.includes('tipo de contratação: clt')) contract_type = 'clt';
      else if (contractContext.includes('tipo de contratação: pj')) contract_type = 'pj';
      else if (/\bestágio\b|\bestagio\b|\binternship\b|\baprendiz\b/i.test(contractContext)) contract_type = 'estagio';
      else if (/\bclt\b/.test(contractContext)) contract_type = 'clt';
      else if (/\bpj\b|\bpessoa\s+jur[ií]dica\b/.test(contractContext)) contract_type = 'pj';
    }

    // ---- WORK TYPE ----
    let work_type = '';
    // Strategy 1: "Modalidade de trabalho: Presencial"
    const workMatch = (dadosSection || bodyText).match(/modalidade\s+(?:de\s+)?trabalho\s*[:：]\s*([^\n•]+)/i);
    if (workMatch) {
      const wt = workMatch[1].trim().toLowerCase();
      if (wt.includes('remoto') || wt.includes('remote') || wt.includes('home office')) work_type = 'remoto';
      else if (wt.includes('híbrido') || wt.includes('hibrido') || wt.includes('hybrid')) work_type = 'hibrido';
      else if (wt.includes('presencial') || wt.includes('on-site') || wt.includes('onsite')) work_type = 'presencial';
    }
    // Strategy 2: fallback
    if (!work_type) {
      if (/modalidade[^:]*:\s*presencial|modelo[^:]*:\s*presencial/i.test(bodyText)) work_type = 'presencial';
      else if (/modalidade[^:]*:\s*remoto|modelo[^:]*:\s*remoto|home\s*office/i.test(bodyText)) work_type = 'remoto';
      else if (/modalidade[^:]*:\s*h[ií]brido|modelo[^:]*:\s*h[ií]brido/i.test(bodyText)) work_type = 'hibrido';
    }

    // ---- DESCRIPTION (Responsabilidades e atribuições) ----
    let description = '';
    description = extractSectionContent(['Responsabilidades e atribuições', 'Descrição da vaga', 'Descrição', 'Sobre a vaga', 'Job description', 'Description', 'Atividades']);
    // Fallback: CSS selectors
    if (!description) {
      const descSelectors = [
        '.job-description', '.description', '.descricao', '.descricao-vaga',
        '[data-testid="job-description"]', '[itemprop="description"]',
        '.vacancy-description', '.job-details', '.detalhes-vaga',
        '#job-description', '#descricao', '.job-body'
      ];
      for (const sel of descSelectors) {
        const el = $(sel).first();
        if (el.length) {
          const text = el.text().trim();
          if (text && text.length > 20) { description = text; break; }
        }
      }
    }
    // Fallback: og:description / meta description
    if (!description && ogDescription) {
      description = ogDescription;
    }
    if (description.length > 5000) description = description.substring(0, 5000);

    // ---- REQUIREMENTS ----
    let requirements = '';
    requirements = extractSectionContent(['Requisitos e qualificações', 'Requisitos', 'Qualificações', 'Requirements', 'Pré-requisitos', 'Perfil desejado']);
    // Fallback selectors
    if (!requirements) {
      const reqSelectors = ['.requirements', '.requisitos', '.qualifications', '.qualificacoes', '.job-requirements', '#requisitos'];
      for (const sel of reqSelectors) {
        const el = $(sel).first();
        if (el.length) {
          const text = el.text().trim();
          if (text && text.length > 10) { requirements = text; break; }
        }
      }
    }
    if (requirements.length > 5000) requirements = requirements.substring(0, 5000);

    // ---- BENEFITS (extra info) ----
    let benefits = '';
    benefits = extractSectionContent(['Benefícios', 'Benefits', 'Beneficios']);
    if (benefits.length > 1000) benefits = benefits.substring(0, 1000);

    // ---- AREA ----
    let area = '';
    const areaMatch = (dadosSection || bodyText).match(/[aá]rea\s+profissional\s*[:：]\s*([^\n•]+)/i);
    if (areaMatch) area = areaMatch[1].trim();

    // ---- WORKLOAD / CARGA HORÁRIA ----
    let workload = '';
    const workloadMatch = (dadosSection || bodyText).match(/carga\s+hor[aá]ria\s*[:：]\s*([^\n•]+)/i);
    if (workloadMatch) workload = workloadMatch[1].trim();

    // ---- SCHEDULE / JORNADA ----
    let schedule = '';
    const scheduleMatch = (dadosSection || bodyText).match(/jornada\s+(?:de\s+)?trabalho\s*[:：]\s*([^\n•]+)/i);
    if (scheduleMatch) schedule = scheduleMatch[1].trim();

    // ---- Build enriched description ----
    // If we found structured data, append it to description for a complete view
    let enrichedDescription = description;
    const extras = [];
    if (area) extras.push(`Área profissional: ${area}`);
    if (workload) extras.push(`Carga horária: ${workload}`);
    if (schedule) extras.push(`Jornada: ${schedule}`);
    if (salary_text) extras.push(`Salário: ${salary_text}`);
    if (benefits) extras.push(`Benefícios: ${benefits}`);
    if (extras.length > 0) {
      enrichedDescription = (enrichedDescription ? enrichedDescription + '\n\n' : '') + extras.join('\n');
    }

    const result = {
      title: title.substring(0, 200),
      company_name: company_name.substring(0, 200),
      location: location.substring(0, 200),
      description: enrichedDescription,
      requirements,
      contract_type,
      work_type,
      salary_min,
      salary_max,
      salary_text
    };

    // Remove empty/null values
    Object.keys(result).forEach(k => { if (!result[k]) delete result[k]; });

    const fieldsFound = Object.keys(result);
    console.log('[agency-scrape] Dados extraídos:', fieldsFound, '| Título:', result.title, '| Empresa:', result.company_name, '| Local:', result.location);

    const hasMeaningfulData = (result.title && result.title !== result.company_name) || result.description || result.location;

    res.json({
      success: fieldsFound.length >= 1,
      message: isLikelySPA
        ? (fieldsFound.length >= 1
          ? `Dados parciais extraídos (${fieldsFound.length} campos). Este site carrega dados via JavaScript — complete as informações manualmente.`
          : 'Este site não retorna dados no HTML. Preencha os campos manualmente.')
        : (fieldsFound.length > 1
          ? `Dados extraídos com sucesso (${fieldsFound.length} campos). Revise e complete as informações.`
          : 'Não foi possível extrair muitos dados automaticamente. Preencha manualmente.'),
      data: result,
      isSPA: isLikelySPA
    });
  } catch (e) {
    console.error('[agency-scrape] Erro:', e);
    res.json({
      success: false,
      message: 'Erro ao processar a URL. Preencha os dados manualmente.',
      data: {}
    });
  }
});

// ===================== IMPORT EXCEL CANDIDATES =====================

// POST /api/agency/import-candidates - Importar candidaturas de arquivo Excel
router.post('/import-candidates', [
  authenticateToken,
  requireAgency,
  excelUpload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    console.log('[agency-import] Processando arquivo:', req.file.originalname);

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia. Adicione os dados dos candidatos.' });
    }

    console.log('[agency-import] Linhas encontradas:', rows.length);
    console.log('[agency-import] Colunas:', Object.keys(rows[0]));

    await ensureAgencyJobColumns();

    // Ensure external_applications table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_email TEXT NOT NULL,
        student_name TEXT,
        student_id UUID REFERENCES users(id) ON DELETE SET NULL,
        job_title TEXT,
        company_name TEXT,
        external_url TEXT,
        status TEXT DEFAULT 'applied',
        applied_at TIMESTAMP,
        notes TEXT,
        source_file TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ext_app_student ON external_applications(student_email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ext_app_agency ON external_applications(agency_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ext_app_student_id ON external_applications(student_id)');

    // Column name mapping (flexible, accept various formats)
    const normalizeCol = (col) => col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    
    const colMap = {
      email: ['email', 'emailaluno', 'emaildoaluno', 'emailestudante', 'emaildoestudante', 'emailcandidato'],
      name: ['nome', 'nomealuno', 'nomedoaluno', 'nomeestudante', 'nomedoestudante', 'nomecandidato', 'name'],
      job_title: ['vaga', 'titulovaga', 'titulodavaga', 'cargo', 'jobtitle', 'titulo'],
      company: ['empresa', 'nomedaempresa', 'nomeempresa', 'company', 'companyname'],
      url: ['url', 'link', 'linkvaga', 'linkdavaga', 'urlvaga', 'externalurl'],
      status: ['status', 'situacao', 'statusvaga', 'statuscandidatura'],
      date: ['data', 'datacandidatura', 'dataapplicacao', 'dataaplicacao', 'appliedat', 'date'],
      notes: ['observacao', 'observacoes', 'notas', 'notes', 'obs']
    };

    // Find actual column names in the spreadsheet
    const sampleRow = rows[0];
    const actualCols = {};
    const sheetCols = Object.keys(sampleRow);

    for (const [field, aliases] of Object.entries(colMap)) {
      for (const sheetCol of sheetCols) {
        const normalized = normalizeCol(sheetCol);
        if (aliases.includes(normalized)) {
          actualCols[field] = sheetCol;
          break;
        }
      }
    }

    if (!actualCols.email) {
      return res.status(400).json({
        error: 'Coluna de e-mail não encontrada na planilha.',
        hint: 'A planilha deve ter uma coluna chamada "Email" ou "Email do Aluno".',
        columns_found: sheetCols
      });
    }

    let imported = 0;
    let skipped = 0;
    let linked = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = (row[actualCols.email] || '').toString().trim().toLowerCase();

      if (!email || !email.includes('@')) {
        skipped++;
        errors.push(`Linha ${i + 2}: Email inválido ou vazio`);
        continue;
      }

      const name = actualCols.name ? (row[actualCols.name] || '').toString().trim() : '';
      const jobTitle = actualCols.job_title ? (row[actualCols.job_title] || '').toString().trim() : '';
      const company = actualCols.company ? (row[actualCols.company] || '').toString().trim() : '';
      const url = actualCols.url ? (row[actualCols.url] || '').toString().trim() : '';
      const status = actualCols.status ? (row[actualCols.status] || 'applied').toString().trim().toLowerCase() : 'applied';
      const dateStr = actualCols.date ? row[actualCols.date] : null;
      const notes = actualCols.notes ? (row[actualCols.notes] || '').toString().trim() : '';

      // Parse date
      let appliedAt = null;
      if (dateStr) {
        try {
          if (typeof dateStr === 'number') {
            // Excel serial date
            const d = XLSX.SSF.parse_date_code(dateStr);
            appliedAt = new Date(d.y, d.m - 1, d.d);
          } else {
            appliedAt = new Date(dateStr);
          }
          if (isNaN(appliedAt.getTime())) appliedAt = null;
        } catch { appliedAt = null; }
      }

      // Try to find student in the system
      let studentId = null;
      try {
        const studentResult = await pool.query(
          'SELECT id FROM users WHERE LOWER(email) = $1 AND type = $2',
          [email, 'candidate']
        );
        if (studentResult.rows.length > 0) {
          studentId = studentResult.rows[0].id;
          linked++;
        }
      } catch { /* ignore */ }

      // Map status
      let mappedStatus = 'applied';
      if (['contratado', 'hired'].includes(status)) mappedStatus = 'hired';
      else if (['aceito', 'accepted', 'aprovado', 'approved'].includes(status)) mappedStatus = 'accepted';
      else if (['rejeitado', 'rejected', 'reprovado'].includes(status)) mappedStatus = 'rejected';
      else if (['entrevista', 'interview'].includes(status)) mappedStatus = 'interview';
      else if (['pendente', 'pending', 'em analise', 'em análise'].includes(status)) mappedStatus = 'pending';
      else if (['candidatou', 'applied', 'candidatura'].includes(status)) mappedStatus = 'applied';

      // Insert
      try {
        await pool.query(`
          INSERT INTO external_applications 
            (agency_id, student_email, student_name, student_id, job_title, company_name, external_url, status, applied_at, notes, source_file)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          req.user.id, email, name || null, studentId,
          jobTitle || null, company || null, url || null,
          mappedStatus, appliedAt || new Date(), notes || null,
          req.file.originalname
        ]);
        imported++;
      } catch (insertErr) {
        skipped++;
        errors.push(`Linha ${i + 2}: ${insertErr.message}`);
      }
    }

    console.log(`[agency-import] Resultado: ${imported} importados, ${linked} vinculados, ${skipped} ignorados`);

    res.json({
      message: `Importação concluída: ${imported} candidaturas importadas.`,
      imported,
      linked,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 10)
    });
  } catch (e) {
    console.error('[agency-import] Erro:', e);
    res.status(500).json({ error: 'Erro ao processar arquivo: ' + e.message });
  }
});

// GET /api/agency/external-applications - Listar candidaturas externas importadas
router.get('/external-applications', authenticateToken, requireAgency, async (req, res) => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_email TEXT NOT NULL,
        student_name TEXT,
        student_id UUID REFERENCES users(id) ON DELETE SET NULL,
        job_title TEXT,
        company_name TEXT,
        external_url TEXT,
        status TEXT DEFAULT 'applied',
        applied_at TIMESTAMP,
        notes TEXT,
        source_file TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['ea.agency_id = $1'];
    let params = [req.user.id];
    let pc = 1;

    if (search) {
      pc++;
      whereConditions.push(`(ea.student_name ILIKE $${pc} OR ea.student_email ILIKE $${pc} OR ea.job_title ILIKE $${pc} OR ea.company_name ILIKE $${pc})`);
      params.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await pool.query(`
      SELECT 
        ea.*,
        u.name as linked_student_name,
        u.profile_image as linked_student_image
      FROM external_applications ea
      LEFT JOIN users u ON ea.student_id = u.id
      WHERE ${whereClause}
      ORDER BY ea.applied_at DESC, ea.created_at DESC
      LIMIT $${++pc} OFFSET $${++pc}
    `, [...params, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM external_applications ea WHERE ${whereClause}
    `, params);

    res.json({
      applications: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (e) {
    console.error('Erro listando candidaturas externas:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/agency/external-applications/:id
router.delete('/external-applications/:id', [
  authenticateToken,
  requireAgency,
  param('id').isUUID()
], async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM external_applications WHERE id = $1 AND agency_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }
    res.json({ message: 'Candidatura externa removida' });
  } catch (e) {
    console.error('Erro removendo candidatura externa:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===================== CRUD DE VAGAS DA AGÊNCIA =====================

// POST /api/agency/jobs - Criar vaga de agência (com link externo)
router.post('/jobs', [
  authenticateToken,
  requireAgency,
  body('title').notEmpty().withMessage('Título da vaga é obrigatório'),
  body('company_name').notEmpty().withMessage('Nome da empresa é obrigatório'),
  body('external_url').notEmpty().isURL().withMessage('URL externa válida é obrigatória'),
  body('location').optional().isString(),
  body('description').optional().isString(),
  body('requirements').optional().isString(),
  body('contract_type').optional().isString(),
  body('experience_level').optional().isString(),
  body('work_type').optional().isString(),
  body('salary_min').optional().isFloat({ min: 0 }),
  body('salary_max').optional().isFloat({ min: 0 }),
  body('area').optional().isString(),
  body('subarea').optional().isString()
], async (req, res) => {
  try {
    await ensureAgencyJobColumns();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company_name,
      external_url,
      location,
      description,
      requirements,
      contract_type,
      experience_level,
      work_type,
      salary_min,
      salary_max,
      area,
      subarea
    } = req.body;

    const result = await pool.query(`
      INSERT INTO jobs (
        title, company_id, location, description, requirements,
        contract_type, experience_level, work_type, salary_min, salary_max,
        is_active, is_agency_job, external_url, agency_id,
        community_company_name, area, subarea
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        TRUE, TRUE, $11, $2,
        $12, $13, $14
      ) RETURNING *
    `, [
      title, req.user.id, location || null, description || null, requirements || null,
      contract_type || null, experience_level || null, work_type || null,
      salary_min || null, salary_max || null,
      external_url, company_name, area || null, subarea || null
    ]);

    res.status(201).json({
      message: 'Vaga de agência criada com sucesso',
      job: result.rows[0]
    });
  } catch (e) {
    console.error('Erro criando vaga de agência:', e);
    res.status(500).json({ error: 'Erro interno ao criar vaga' });
  }
});

// GET /api/agency/jobs - Listar vagas da agência
router.get('/jobs', authenticateToken, requireAgency, async (req, res) => {
  try {
    await ensureAgencyJobColumns();
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT j.*, 
        j.community_company_name as original_company_name,
        u.company_name as agency_name,
        u.profile_image as agency_logo
      FROM jobs j
      LEFT JOIN users u ON j.agency_id = u.id
      WHERE j.agency_id = $1 AND j.is_agency_job = TRUE
      ORDER BY j.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM jobs WHERE agency_id = $1 AND is_agency_job = TRUE',
      [req.user.id]
    );

    res.json({
      jobs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (e) {
    console.error('Erro listando vagas da agência:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/agency/jobs/:id - Atualizar vaga de agência
router.put('/jobs/:id', [
  authenticateToken,
  requireAgency,
  param('id').isUUID()
], async (req, res) => {
  try {
    await ensureAgencyJobColumns();

    // Verificar se a vaga pertence à agência
    const existing = await pool.query(
      'SELECT id FROM jobs WHERE id = $1 AND agency_id = $2 AND is_agency_job = TRUE',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada ou não pertence a esta agência' });
    }

    const {
      title, company_name, external_url, location, description,
      requirements, contract_type, experience_level, work_type,
      salary_min, salary_max, is_active, area, subarea
    } = req.body;

    // Build dynamic update
    let fields = [];
    let values = [];
    let pc = 0;

    const add = (col, val) => {
      if (val !== undefined) {
        pc++;
        fields.push(`${col} = $${pc}`);
        values.push(val);
      }
    };

    add('title', title);
    add('community_company_name', company_name);
    add('external_url', external_url);
    add('location', location);
    add('description', description);
    add('requirements', requirements);
    add('contract_type', contract_type);
    add('experience_level', experience_level);
    add('work_type', work_type);
    add('salary_min', salary_min);
    add('salary_max', salary_max);
    add('is_active', is_active);
    add('area', area);
    add('subarea', subarea);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    fields.push(`updated_at = NOW()`);
    pc++;
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE jobs SET ${fields.join(', ')} WHERE id = $${pc} RETURNING *`,
      values
    );

    res.json({ message: 'Vaga atualizada', job: result.rows[0] });
  } catch (e) {
    console.error('Erro atualizando vaga de agência:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/agency/jobs/:id - Deletar vaga de agência
router.delete('/jobs/:id', [
  authenticateToken,
  requireAgency,
  param('id').isUUID()
], async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM jobs WHERE id = $1 AND agency_id = $2 AND is_agency_job = TRUE RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada ou não pertence a esta agência' });
    }

    res.json({ message: 'Vaga deletada com sucesso' });
  } catch (e) {
    console.error('Erro deletando vaga de agência:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===================== DADOS DE CANDIDATOS (AGÊNCIA) =====================

// GET /api/agency/candidates - Listar alunos que visualizaram (clicaram em "Ver") as vagas da agência
router.get('/candidates', authenticateToken, requireAgency, async (req, res) => {
  try {
    await ensureAgencyJobColumns();
    // Ensure job_views table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS job_views (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
          ip_hash TEXT NULL,
          user_agent_hash TEXT NULL,
          viewed_on DATE NOT NULL DEFAULT CURRENT_DATE
        )
      `);
    } catch (_) {}

    const { job_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let filterParams = [req.user.id];
    let pc = 1;
    let jobFilter = '';

    if (job_id) {
      pc++;
      jobFilter = `AND jv.job_id = $${pc}`;
      filterParams.push(job_id);
    }

    const innerQuery = `
      SELECT DISTINCT ON (u.id, jv.job_id)
        jv.job_id,
        jv.viewed_on as viewed_at,
        j.title as job_title,
        j.community_company_name as job_company,
        u.id as candidate_id,
        u.name as candidate_name,
        u.email as candidate_email,
        u.phone as candidate_phone,
        u.profile_image as candidate_image,
        u.bio as candidate_bio,
        u.location as candidate_location
      FROM job_views jv
      JOIN jobs j ON jv.job_id = j.id
      JOIN users u ON jv.user_id = u.id
      WHERE j.agency_id = $1 AND j.is_agency_job = TRUE
        AND jv.user_id IS NOT NULL AND u.type = 'candidate'
        ${jobFilter}
      ORDER BY u.id, jv.job_id, jv.viewed_on DESC
    `;

    const result = await pool.query(`
      SELECT * FROM (${innerQuery}) sub
      ORDER BY viewed_at DESC
      LIMIT $${pc + 1} OFFSET $${pc + 2}
    `, [...filterParams, parseInt(limit), offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM (
        SELECT DISTINCT u.id, jv.job_id
        FROM job_views jv
        JOIN jobs j ON jv.job_id = j.id
        JOIN users u ON jv.user_id = u.id
        WHERE j.agency_id = $1 AND j.is_agency_job = TRUE
          AND jv.user_id IS NOT NULL AND u.type = 'candidate'
          ${jobFilter}
      ) sub
    `, filterParams);

    res.json({
      candidates: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    });
  } catch (e) {
    console.error('Erro listando visualizadores das vagas da agência:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/agency/stats - Estatísticas da agência
router.get('/stats', authenticateToken, requireAgency, async (req, res) => {
  try {
    await ensureAgencyJobColumns();

    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE j.is_active = TRUE) as active_jobs,
        COUNT(*) as total_jobs,
        COALESCE((
          SELECT COUNT(*) FROM applications a 
          JOIN jobs jj ON a.job_id = jj.id 
          WHERE jj.agency_id = $1 AND jj.is_agency_job = TRUE
        ), 0) as total_applications,
        COALESCE((
          SELECT COUNT(DISTINCT a.user_id) FROM applications a
          JOIN jobs jj ON a.job_id = jj.id
          WHERE jj.agency_id = $1 AND jj.is_agency_job = TRUE
        ), 0) as unique_candidates
      FROM jobs j
      WHERE j.agency_id = $1 AND j.is_agency_job = TRUE
    `, [req.user.id]);

    res.json(stats.rows[0] || { active_jobs: 0, total_jobs: 0, total_applications: 0, unique_candidates: 0 });
  } catch (e) {
    console.error('Erro obtendo stats da agência:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/agency/check - Verificar se o usuário logado é agência
router.get('/check', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.json({ isAgency: false });
    }
    const result = await pool.query(
      'SELECT is_agency FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ isAgency: result.rows[0]?.is_agency || false });
  } catch (e) {
    console.error('Erro verificando agência:', e);
    res.json({ isAgency: false });
  }
});

export default router;
