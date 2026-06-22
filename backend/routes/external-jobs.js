import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Cache simples para evitar muitas requisições
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Função para limpar cache antigo
const cleanCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
};


// Helper para deduplicar (title + company + location)
const dedupeJobs = (jobs) => {
  const seen = new Set();
  const out = [];
  for (const j of jobs) {
    const companyName = j.company_name || j.company || '';
    const key = `${(j.title||'').toLowerCase()}|${companyName.toLowerCase()}|${(j.location||'').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(j);
    }
  }
  return out;
};

// Fonte real adicional: Adzuna (multi-page)
const searchAdzunaJobs = async (searchTerm, location = '', limit = 10, pages = 1) => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || 'br';
  if (!appId || !appKey) return [];
  const effectiveLimit = !isFinite(limit) ? 'all' : limit;
  const cacheKey = `adzuna_${searchTerm}_${location}_${effectiveLimit}_${pages}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  const aggregated = [];
  try {
    for (let page = 1; page <= pages; page++) {
      if (isFinite(limit) && aggregated.length >= limit) break;
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        what: searchTerm,
        results_per_page: String(isFinite(limit) ? Math.min(50, limit) : 50)
      });
      if (location) params.append('where', location);
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`;
      console.log(`[Adzuna] Fetch page=${page} url=${url}`);
      const response = await axios.get(url, { timeout: 12000 });
      const results = response.data?.results || [];
      console.log(`[Adzuna] Page ${page} returned ${results.length} jobs`);
      if (!results.length) break;
      for (const r of results) {
        if (isFinite(limit) && aggregated.length >= limit) break;
        aggregated.push({
          id: `adzuna_${r.id || Buffer.from(`${r.title}_${r.company?.display_name||''}`).toString('base64')}`,
          title: r.title,
          company: r.company?.display_name || 'Empresa Não Informada',
          location: r.location?.display_name || location || 'Local não informado',
          description: r.description?.substring(0, 1000) || 'Descrição não disponível',
          url: r.redirect_url,
          source: 'adzuna',
          external_source: 'adzuna',
          posted_date: r.created || new Date().toISOString(),
          employment_type: r.contract_type || 'Não especificado',
          work_type: r.contract_time || 'Não especificado',
          experience_level: 'Não especificado',
          salary_min: r.salary_min || null,
          salary_max: r.salary_max || null
        });
      }
    }
    cache.set(cacheKey, { data: aggregated, timestamp: Date.now() });
    return aggregated;
  } catch (error) {
    console.error('Erro ao buscar vagas no Adzuna:', error.message);
    return aggregated;
  }
};

// Endpoint para buscar vagas externas
router.get('/external-search', authenticateToken, async (req, res) => {
  try {
    cleanCache(); // Limpar cache antigo

    const { 
      search = '', 
      location = '', 
      sources = 'linkedin,indeed',
      limit = 15,
      pages
    } = req.query;

    if (!search.trim()) {
      return res.status(400).json({ 
        error: 'Termo de busca é obrigatório' 
      });
    }

    let sourcesArray = sources.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    // Normalizar 'indeed' para 'adzuna' para manter compatibilidade
    sourcesArray = sourcesArray.map(s => s === 'indeed' ? 'adzuna' : s);
    const includeAdzuna = sourcesArray.includes('adzuna');
    if (!includeAdzuna) {
      return res.status(400).json({ error: 'Nenhuma fonte real solicitada (use adzuna)' });
    }

    const unlimited = String(limit).toLowerCase() === 'all';
    const parsedLimit = parseInt(limit);
    const effectiveLimit = unlimited || isNaN(parsedLimit) ? Infinity : parsedLimit;

    // Lógica de páginas: quando ilimitado e SEM filtros (apenas termo básico), capar número de páginas
    // Critério de "sem filtro": nenhuma localização informada. (Outros filtros de área são aplicados só no frontend.)
    const unfiltered = !location?.trim();
    const MAX_UNFILTERED_PAGES = 5; // Hard cap para evitar excesso de requisições na busca ampla
    const requestedPagesRaw = pages ? parseInt(pages) : undefined;
    let effectivePages;
    if (unlimited) {
      // Se ilimitado e sem filtro -> cap; se houver filtro (ex: location) usa pages informado ou default 5
      effectivePages = requestedPagesRaw || 5;
      if (unfiltered && effectivePages > MAX_UNFILTERED_PAGES) {
        effectivePages = MAX_UNFILTERED_PAGES;
      }
    } else {
      effectivePages = requestedPagesRaw || 1;
    }

    let allJobs = await searchAdzunaJobs(search, location, effectiveLimit, effectivePages);
  allJobs = dedupeJobs(allJobs);

    // Embaralhar somente se limite finito (para variar). Se all, mantém ordem original agrupada.
    const finalJobs = isFinite(effectiveLimit)
      ? allJobs.sort(() => 0.5 - Math.random()).slice(0, effectiveLimit)
      : allJobs;

    const sourceCounts = finalJobs.reduce((acc,j)=>{ acc[j.source]=(acc[j.source]||0)+1; return acc;},{});
    // anexa meta em cada job para frontend poder exibir total bruto
  const enriched = finalJobs.map(j=> ({ ...j, raw_total: allJobs.length }));
    res.json({
      success: true,
      jobs: enriched,
      total: enriched.length,
      total_raw: allJobs.length,
      unlimited: !isFinite(effectiveLimit),
      pages_requested: requestedPagesRaw || null,
      pages_used: effectivePages,
      sources: ['adzuna'],
      capped_unfiltered: unlimited && unfiltered && (effectivePages === MAX_UNFILTERED_PAGES),
      cap_reason: (unlimited && unfiltered && (effectivePages === MAX_UNFILTERED_PAGES)) ? 'unfiltered_cap' : null,
      source_counts: sourceCounts,
      searchTerm: search,
      location: location || 'Todas as regiões'
    });

  } catch (error) {
    console.error('Erro na busca externa:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Endpoint para obter vagas sugeridas baseadas no perfil do usuário
router.get('/suggested-jobs', authenticateToken, async (req, res) => {
  try {
    const { user } = req;
    if (user.type !== 'candidate') {
      return res.status(403).json({ error: 'Apenas candidatos podem receber sugestões' });
    }
    const userCourse = user.course || 'Tecnologia';
    const userLocation = user.location || '';
    const adzunaJobs = await searchAdzunaJobs(userCourse, userLocation, 20);
    let combined = dedupeJobs([...adzunaJobs]);

    if (combined.length === 0) {
      return res.json({ success: true, jobs: [], total: 0, basedOn: { course: userCourse, location: userLocation } });
    }

    res.json({
      success: true,
      jobs: combined,
      total: combined.length,
      basedOn: { course: userCourse, location: userLocation || 'Todas as regiões' }
    });
  } catch (error) {
    console.error('Erro ao obter sugestões:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

// Endpoint para buscar vagas por área específica
router.get('/by-area/:area', authenticateToken, async (req, res) => {
  try {
    const { area } = req.params;
    const { location = '', limit = 15 } = req.query;
    const searchTerms = {
      'tecnologia': 'desenvolvedor programador software',
      'saude': 'enfermeiro médico farmacêutico',
      'educacao': 'professor coordenador pedagógico',
      'engenharia': 'engenheiro técnico projetos',
      'administracao': 'administrador gestor analista',
      'vendas': 'vendedor comercial representante',
      'marketing': 'marketing digital social media',
      'financas': 'financeiro contabilidade analista',
      'design': 'designer gráfico UI UX',
      'direito': 'advogado jurídico legal'
    };
    const searchTerm = searchTerms[area.toLowerCase()] || area;
    const adzunaJobs = await searchAdzunaJobs(searchTerm, location, limit);
    let combined = dedupeJobs([...adzunaJobs]).slice(0, parseInt(limit));
    res.json({ success: true, jobs: combined, total: combined.length, area, searchTerm, location: location || 'Todas as regiões' });
  } catch (error) {
    console.error('Erro ao buscar vagas por área:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
});

export default router;