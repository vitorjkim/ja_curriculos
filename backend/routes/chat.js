import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// In-memory cache (simple) for link previews (reduz requisições repetidas)
const linkPreviewCache = new Map(); // key=url, value={ preview, expires }
const PREVIEW_TTL_MS = 10 * 60 * 1000; // 10 minutos
function getCachedPreview(url){
  const item = linkPreviewCache.get(url);
  if(!item) return null;
  if(Date.now() > item.expires){ linkPreviewCache.delete(url); return null; }
  return item.preview;
}
function setCachedPreview(url, preview){
  linkPreviewCache.set(url,{ preview, expires: Date.now()+PREVIEW_TTL_MS });
}

const router = express.Router();

// --- 🔔 Group (School/Class) Broadcast Messaging ---------------------------------
// Virtual groups: one per school (school-wide) and one per class (school_classes row).
// Only school users can POST messages. Students (candidates linked in students table) can read.
// Table: group_messages (school_id, class_id nullable) stores messages. No separate groups table needed.

async function ensureGroupMessagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NULL REFERENCES school_classes(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_group_messages_school_class ON group_messages(school_id, class_id, created_at);
    `);
  } catch (e) {
    console.error('Erro ao garantir tabela group_messages', e);
  }
}

ensureGroupMessagesTable();

// Helper to parse group key from URL (format: school:<schoolId> or class:<classId>)
function parseGroupKey(key) {
  if (!key) return null;
  const [type, id] = key.split(':');
  if (!id || (type !== 'school' && type !== 'class')) return null;
  return { type, id };
}

// GET /api/chat/groups - List groups for current user
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const userType = req.user.type;
    if (userType === 'candidate') {
      // Find student linkage
      const r = await pool.query(`
        SELECT s.school_id, s.class_id, sc.name as class_name, u.school_name, u.profile_image as school_profile_image
        FROM students s
        JOIN users u ON u.id = s.school_id
        LEFT JOIN school_classes sc ON sc.id = s.class_id
        WHERE s.user_id = $1
        LIMIT 1
      `, [req.user.id]);
      if (r.rows.length === 0) return res.json([]); // Not a student (regular candidate)
      const row = r.rows[0];
      const groups = [];
      // School-wide group
      groups.push({
        key: `school:${row.school_id}`,
        type: 'school',
        schoolId: row.school_id,
        classId: null,
        name: row.school_name || 'Escola',
        schoolProfileImage: row.school_profile_image || null,
      });
      if (row.class_id) {
        groups.push({
          key: `class:${row.class_id}`,
            type: 'class',
            schoolId: row.school_id,
            classId: row.class_id,
            name: row.class_name || 'Turma',
            schoolProfileImage: row.school_profile_image || null,
        });
      }
      // Attach last message metadata in one query
      const ids = [row.school_id];
      const classIds = row.class_id ? [row.class_id] : [];
      const meta = await pool.query(`
        SELECT class_id, MAX(created_at) as last_message_at,
               (ARRAY_AGG(message ORDER BY created_at DESC))[1] as last_message
        FROM group_messages
        WHERE school_id = $1
          AND (class_id IS NULL OR class_id = ANY($2))
        GROUP BY class_id
      `, [row.school_id, classIds]);
      const map = {};
      meta.rows.forEach(m => { map[m.class_id || 'SCHOOL'] = m; });
      groups.forEach(g => {
        const k = g.type === 'school' ? 'SCHOOL' : g.classId;
        const m = map[k];
        if (m) {
          g.lastMessageAt = m.last_message_at;
          g.lastMessage = m.last_message;
        }
      });
      return res.json(groups);
    } else if (userType === 'school') {
      // List school-wide + all classes
      const schoolId = req.user.id;
      const schoolRow = await pool.query('SELECT school_name, profile_image FROM users WHERE id=$1', [schoolId]);
      const classRows = await pool.query('SELECT id, name FROM school_classes WHERE school_id=$1 ORDER BY name ASC', [schoolId]);
      const schoolProfileImage = schoolRow.rows[0]?.profile_image || null;
      const groups = [
        {
          key: `school:${schoolId}`,
          type: 'school',
          schoolId,
          classId: null,
          name: schoolRow.rows[0]?.school_name || 'Escola',
          schoolProfileImage,
        },
        ...classRows.rows.map(c => ({
          key: `class:${c.id}`,
          type: 'class',
          schoolId,
          classId: c.id,
          name: c.name,
          schoolProfileImage,
        }))
      ];
      // Metadata
      const meta = await pool.query(`
        SELECT class_id, MAX(created_at) as last_message_at,
               (ARRAY_AGG(message ORDER BY created_at DESC))[1] as last_message
        FROM group_messages
        WHERE school_id = $1
        GROUP BY class_id
      `, [schoolId]);
      const map = {};
      meta.rows.forEach(m => { map[m.class_id || 'SCHOOL'] = m; });
      groups.forEach(g => {
        const k = g.type === 'school' ? 'SCHOOL' : g.classId;
        const m = map[k];
        if (m) {
          g.lastMessageAt = m.last_message_at;
          g.lastMessage = m.last_message;
        }
      });
      return res.json(groups);
    } else if (userType === 'company') {
      // Companies have no group messages (for now)
      return res.json([]);
    }
    return res.status(400).json({ error: 'Tipo de usuário não suportado' });
  } catch (e) {
    console.error('Erro ao listar grupos', e);
    res.status(500).json({ error: 'Erro interno ao listar grupos' });
  }
});

// GET /api/chat/groups/:groupKey/messages - Fetch messages for a group
router.get('/groups/:groupKey/messages', authenticateToken, async (req, res) => {
  try {
    const { groupKey } = req.params;
    const parsed = parseGroupKey(groupKey);
    if (!parsed) return res.status(400).json({ error: 'groupKey inválido' });
    const userType = req.user.type;

    if (userType === 'candidate') {
      // Ensure membership
      const stu = await pool.query('SELECT school_id, class_id FROM students WHERE user_id=$1 LIMIT 1', [req.user.id]);
      if (stu.rows.length === 0) return res.status(403).json({ error: 'Não é aluno' });
      const { school_id, class_id } = stu.rows[0];
      if (parsed.type === 'school') {
        if (parsed.id !== school_id) return res.status(403).json({ error: 'Acesso negado' });
      } else { // class
        if (!class_id || parsed.id !== class_id) return res.status(403).json({ error: 'Acesso negado' });
      }
      const whereClass = parsed.type === 'school' ? 'class_id IS NULL' : 'class_id = $2';
      const params = parsed.type === 'school' ? [school_id] : [school_id, parsed.id];
      const q = await pool.query(`
        SELECT gm.*, u.name, u.school_name, u.type
        FROM group_messages gm
        JOIN users u ON u.id = gm.sender_id
        WHERE gm.school_id = $1 AND ${whereClass}
        ORDER BY gm.created_at ASC
        LIMIT 500
      `, params);
      return res.json(q.rows.map(r => ({
        id: r.id,
        message: r.message,
        createdAt: r.created_at,
        senderId: r.sender_id,
        senderName: r.type === 'school' ? (r.school_name || 'Escola') : r.name,
        senderType: r.type
      })));
    } else if (userType === 'school') {
      const schoolId = req.user.id;
      if (parsed.type === 'school') {
        if (parsed.id !== schoolId) return res.status(403).json({ error: 'Acesso negado' });
        const q = await pool.query(`
          SELECT gm.*, u.school_name, u.name, u.type
          FROM group_messages gm
          JOIN users u ON u.id = gm.sender_id
          WHERE gm.school_id=$1 AND gm.class_id IS NULL
          ORDER BY gm.created_at ASC
          LIMIT 500
        `, [schoolId]);
        return res.json(q.rows.map(r => ({
          id: r.id,
          message: r.message,
          createdAt: r.created_at,
          senderId: r.sender_id,
          senderName: r.school_name || r.name,
          senderType: r.type
        })));
      } else { // class
        // Validate class belongs to school
        const cls = await pool.query('SELECT id FROM school_classes WHERE id=$1 AND school_id=$2', [parsed.id, schoolId]);
        if (cls.rows.length === 0) return res.status(403).json({ error: 'Turma não pertence à escola' });
        const q = await pool.query(`
          SELECT gm.*, u.school_name, u.name, u.type
          FROM group_messages gm
          JOIN users u ON u.id = gm.sender_id
          WHERE gm.school_id=$1 AND gm.class_id=$2
          ORDER BY gm.created_at ASC
          LIMIT 500
        `, [schoolId, parsed.id]);
        return res.json(q.rows.map(r => ({
          id: r.id,
          message: r.message,
          createdAt: r.created_at,
          senderId: r.sender_id,
          senderName: r.school_name || r.name,
          senderType: r.type
        })));
      }
    } else {
      return res.status(403).json({ error: 'Tipo de usuário não autorizado' });
    }
  } catch (e) {
    console.error('Erro ao buscar mensagens de grupo', e);
    res.status(500).json({ error: 'Erro interno ao buscar mensagens' });
  }
});

// POST /api/chat/groups/:groupKey/messages - Send message (school only)
router.post('/groups/:groupKey/messages', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'school') return res.status(403).json({ error: 'Apenas escolas podem enviar mensagens de grupo' });
    const { groupKey } = req.params;
    const { message } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ error: 'Mensagem vazia' });
    const parsed = parseGroupKey(groupKey);
    if (!parsed) return res.status(400).json({ error: 'groupKey inválido' });
    const schoolId = req.user.id;
    let classId = null;
    if (parsed.type === 'school') {
      if (parsed.id !== schoolId) return res.status(403).json({ error: 'Acesso negado ao grupo da escola' });
    } else { // class
      const cls = await pool.query('SELECT id FROM school_classes WHERE id=$1 AND school_id=$2', [parsed.id, schoolId]);
      if (cls.rows.length === 0) return res.status(403).json({ error: 'Turma não pertence à escola' });
      classId = parsed.id;
    }
    const ins = await pool.query(`
      INSERT INTO group_messages (school_id, class_id, sender_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [schoolId, classId, req.user.id, message.trim()]);
    const row = ins.rows[0];
    res.json({
      id: row.id,
      message: message.trim(),
      createdAt: row.created_at,
      senderId: req.user.id,
      senderName: req.user.school_name || 'Escola',
      senderType: 'school',
      groupKey
    });
  } catch (e) {
    console.error('Erro ao enviar mensagem de grupo', e);
    res.status(500).json({ error: 'Erro interno ao enviar mensagem' });
  }
});

// GET /api/chat/link-preview?url=...
// Retorna metadados básicos (OpenGraph/Título) para montar card no frontend.
router.get('/link-preview', authenticateToken, async (req,res)=>{
  try {
    const { url, nocache, debug } = req.query;
    if(!url) return res.status(400).json({ error:'url obrigatória'});
    if(!/^https?:\/\//i.test(url)) return res.status(400).json({ error:'URL inválida' });

    // Cache
    if(!nocache){
      const cached = getCachedPreview(url);
      if(cached) return res.json({ success:true, preview: cached, cached:true });
    }

    const resp = await axios.get(url, { timeout: 10000, maxRedirects:5, headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 CurriculoJaBot',
      'Accept-Language':'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    }});
    const html = resp.data || '';
    const $ = cheerio.load(html);
    const pick = (...cands)=> cands.find(v=> v && typeof v === 'string' && v.trim());
    const base = new URL(url);

    let rawTitle = pick(
      $('meta[property="og:title"]').attr('content'),
      $('meta[name="twitter:title"]').attr('content'),
      $('title').first().text(),
      $('h1').first().text()
    );

    let rawDesc = pick(
      $('meta[property="og:description"]').attr('content'),
      $('meta[name="twitter:description"]').attr('content'),
      $('meta[name="description"]').attr('content')
    ) || firstParagraphLongerThan($, 40) || '';

    // EXTRAÇÃO ESPECÍFICA / MELHORADA (ex: páginas de vaga que usam JSON-LD ou carregam via JS)
    try {
      const job = extractJobPosting($);
      if(job){
        if(!rawTitle && job.title) rawTitle = job.title;
        if((!rawDesc || rawDesc.length < 60) && job.description){
          rawDesc = job.description;
        }
      }
    } catch(e){ /* silencioso */ }

    // Se ainda descrição muito curta, concatena primeiros parágrafos
    if(rawDesc && rawDesc.length < 60){
      const enriched = collectParagraphs($, 3, 360);
      if(enriched.length > rawDesc.length) rawDesc = enriched;
    }

    // Se título muito genérico (ex: domínio) e temos path legível, tenta gerar
    if(rawTitle && /^(Home|Index|Abrir link)$/i.test(rawTitle.trim())){
      const pathTitle = deriveTitleFromPath(base.pathname);
      if(pathTitle) rawTitle = pathTitle;
    }

    // DOMÍNIO ESPECÍFICO (ex: plataformas de vagas que carregam via JS) - tentativa de extrair JSON crú
    if(base.hostname.endsWith('vagas.solides.com.br')){
      try {
        const enriched = extractFromRawHTML(html, [
          'description','descricao','descricaoVaga','descricaoDaVaga','descricao_da_vaga','descricaoCargo','responsibilities','responsabilidades','summary','resumo','atividades','detalhes'
        ]);
        if(enriched && enriched.length > (rawDesc? rawDesc.length:0)) rawDesc = enriched;
        const jobTitle = extractFromRawHTML(html, ['jobTitle','title','cargo','nome'], 10, 120, true);
        if(jobTitle && (!rawTitle || rawTitle.length < 5 || /Abrir link/i.test(rawTitle))) rawTitle = jobTitle;
      } catch(e){ /* ignore */ }
    }

    // Heurísticas adicionais se descrição ainda insuficiente (<80 chars)
    if(!rawDesc || rawDesc.length < 80){
      try {
        if(html.includes('@type":"JobPosting"')){
          const loose = extractJobPostingLoose(html);
          if(loose && loose.description && loose.description.length > (rawDesc? rawDesc.length:0)){
            rawDesc = loose.description;
            if(!rawTitle && loose.title) rawTitle = loose.title;
          }
        }
      } catch(e){ /* ignore */ }
    }

    // Se ainda curto tenta extrair listas (<li>) relevantes
    if(!rawDesc || rawDesc.length < 80){
      try {
        const listTxt = extractRelevantLists($, 4, 360);
        if(listTxt && listTxt.length > (rawDesc? rawDesc.length:0)) rawDesc = listTxt;
      } catch(e){ /* ignore */ }
    }

    // Se mesmo assim curto, pega parágrafo mais longo (conteúdo principal)
    if(!rawDesc || rawDesc.length < 80){
      const longP = bestLongParagraph($, 120, 420);
      if(longP && longP.length > (rawDesc? rawDesc.length:0)) rawDesc = longP;
    }

    // Último fallback: deriva texto do path (slug) se nada útil
    if((!rawDesc || rawDesc.length < 40) && base.pathname){
      const slug = base.pathname.split('/').filter(Boolean).pop() || '';
      const cleanedSlug = slug.replace(/[-_]+/g,' ').replace(/\d{3,}/g,' ').trim();
      if(cleanedSlug && cleanedSlug.length > 3) rawDesc = capitalizeWords(cleanedSlug);
    }

    // Image priority list
    let rawImg = pick(
      $('meta[property="og:image:secure_url"]').attr('content'),
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      bestAppleTouchIcon($),
      bestIconLink($),
      $('img').first().attr('src')
    );

    rawImg = absolutize(rawImg, base);

    const siteName = pick(
      $('meta[property="og:site_name"]').attr('content'),
      $('meta[name="application-name"]').attr('content'),
      capitalizeWords(base.hostname.replace('www.',''))
    );

    const preview = {
      url,
      title: rawTitle || siteName,
      description: truncate(rawDesc, 260),
      image: rawImg,
      siteName
    };

    setCachedPreview(url, preview);
    if(debug){
      return res.json({ success:true, preview, debug:{
        usedTitle: rawTitle,
        usedDesc: rawDesc,
        hostname: base.hostname,
        path: base.pathname
      }});
    }
    res.json({ success:true, preview });
  } catch(e){
    console.error('Erro link-preview', e.message);
    res.status(500).json({ success:false, error:'Falha ao obter preview'});
  }
});

function truncate(str='', max=260){ if(str.length<=max) return str.trim(); return str.slice(0,max-1).trim()+'…'; }
function capitalizeWords(str=''){ return str.split(/[-.\s_]+/).map(s=> s.charAt(0).toUpperCase()+s.slice(1)).join(' '); }
function absolutize(src, base){ if(!src) return undefined; if(/^https?:\/\//i.test(src)) return src; if(src.startsWith('//')) return base.protocol + src; if(src.startsWith('/')) return base.origin + src; return base.origin + (src.startsWith('.')? src.slice(1): (src.startsWith('#')? '' : '/' + src)); }
function bestIconLink($){
  let best;
  $('link[rel~="icon"]').each((_,el)=>{ const href = $(el).attr('href'); if(!href) return; const sizes = $(el).attr('sizes'); if(!best) best = href; if(sizes){ const n = parseInt(sizes); if(n && n>=64) best = href; } });
  if(!best){ // fallback
    if($('link[rel="shortcut icon"]').attr('href')) best = $('link[rel="shortcut icon"]').attr('href');
  }
  if(!best) best = '/favicon.ico';
  return best;
}
function bestAppleTouchIcon($){
  let best;
  $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_,el)=>{ const href=$(el).attr('href'); if(!href) return; const sizes=$(el).attr('sizes'); if(!best) best=href; if(sizes){ const n=parseInt(sizes); if(n && n>=120) best=href; } });
  return best;
}
function firstParagraphLongerThan($, minChars){
  let text='';
  $('p').each((_,el)=>{ const t=$(el).text().trim(); if(t.length>=minChars && !text){ text=t; } });
  return text;
}

// Tenta extrair JobPosting de scripts JSON-LD
function extractJobPosting($){
  let found;
  $('script[type="application/ld+json"]').each((_,el)=>{
    if(found) return;
    let txt = $(el).contents().text();
    if(!txt) return;
    try {
      const data = JSON.parse(txt.trim());
      const list = Array.isArray(data) ? data : [data];
      for(const item of list){
        if(item && (item['@type']==='JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')))){
          const desc = sanitizeText(item.description || '');
            found = {
              title: sanitizeText(item.title || item.name || ''),
              description: desc
            };
            break;
        }
      }
    } catch(e){ /* ignore */ }
  });
  return found;
}

function sanitizeText(html=''){
  if(!html) return '';
  return html
    .replace(/<br\s*\/?>(?=\s*<br\s*\/?)/gi,'\n')
    .replace(/<\/(p|div|li)>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&apos;/g, "'")
    .replace(/&[a-zA-Z]+;/g,' ')
    .replace(/\s+/g,' ') // normaliza
    .trim();
}

function collectParagraphs($, maxP=3, maxChars=360){
  const parts=[]; let total=0;
  $('p').each((i,el)=>{
    if(parts.length>=maxP || total>=maxChars) return;
    const t=$(el).text().trim();
    if(t && t.length>25){
      parts.push(t);
      total += t.length;
    }
  });
  return parts.join(' ').slice(0, maxChars);
}

function deriveTitleFromPath(pathname=''){
  if(!pathname) return '';
  const segs = pathname.split('/').filter(Boolean).filter(s=> !/^vaga$/i.test(s));
  if(!segs.length) return '';
  const last = segs[segs.length-1].replace(/[-_]+/g,' ').replace(/\d{4,}/g,'').trim();
  if(last && last.length>2) return capitalizeWords(last);
  return '';
}

// Extrai pares chave:valor em JSON embutido no HTML bruto (sem necessidade de parsing DOM adicional)
function extractFromRawHTML(html, keys=[], minLen=40, maxLen=400, singleLine=false){
  if(!html) return '';
  let best='';
  for(const key of keys){
    // procura "key":"valor" permitindo escapes; não muito ganancioso
    const regex = new RegExp('"'+key+'"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"','gi');
    let m; let longest='';
    while((m = regex.exec(html))){
      let txt = m[1] || '';
      txt = txt.replace(/\\n/g,' ').replace(/\\r/g,' ').replace(/\\t/g,' ').replace(/\\"/g,'"');
      txt = txt.replace(/<[^>]+>/g,' ');
      txt = txt.replace(/\s+/g,' ').trim();
      if(txt.length > longest.length) longest = txt;
    }
    if(longest.length >= minLen){
      best = longest;
      break;
    }
  }
  if(best && best.length > maxLen) best = best.slice(0, maxLen-1)+'…';
  if(singleLine) best = best.split(/\.|\n/)[0].trim();
  return best;
}

// Captura grosseiramente objeto JobPosting quando minificado (sem precisar DOM)
function extractJobPostingLoose(html){
  try {
    const idx = html.indexOf('@type":"JobPosting"');
    if(idx === -1) return null;
    // retrocede até início de { e avança até fechar balanceado
    let start = html.lastIndexOf('{', idx);
    if(start === -1) return null;
    let brace = 0; let end = start; let opened=false;
    for(let i=start; i<html.length; i++){
      const ch = html[i];
      if(ch === '{'){ brace++; opened=true; }
      else if(ch === '}'){ brace--; if(opened && brace===0){ end = i; break; } }
    }
    if(brace!==0) return null;
    const slice = html.slice(start, end+1);
    // Sanitiza possiveis quebras unicode escapadas
    const cleaned = slice.replace(/\\x3c/gi,'<');
    const obj = JSON.parse(cleaned);
    if(obj && (obj['@type']==='JobPosting' || (Array.isArray(obj['@type']) && obj['@type'].includes('JobPosting')))){
      return {
        title: sanitizeText(obj.title || obj.name || ''),
        description: sanitizeText(obj.description || '')
      };
    }
    return null;
  } catch(e){ return null; }
}

// Extrai até N itens de listas relacionadas a responsabilidades/requisitos
function extractRelevantLists($, maxItems=4, maxChars=360){
  const selectors = [
    'ul', 'ol'
  ];
  let chosen=[];
  for(const sel of selectors){
    $(sel).each((_,el)=>{
      if(chosen.length >= maxItems) return;
      const parentTxt = ($(el).attr('class')||'') + ' ' + ($(el).attr('id')||'');
      if(/descri|respons|atividades|requisitos|summary|resumo/i.test(parentTxt)){
        $(el).find('li').each((__,li)=>{
          if(chosen.length >= maxItems) return;
          const t = $(li).text().trim();
          if(t.length > 15) chosen.push(t);
        });
      }
    });
    if(chosen.length >= maxItems) break;
  }
  if(!chosen.length) return '';
  const joined = chosen.join(' • ');
  return joined.slice(0, maxChars);
}

// Retorna parágrafo mais longo acima de minLen (ignorando muito curtos ou repetitivos)
function bestLongParagraph($, minLen=120, maxLen=420){
  let best='';
  $('p').each((_,el)=>{
    const t=$(el).text().replace(/\s+/g,' ').trim();
    if(t.length >= minLen && t.length <= 2000){
      if(t.length > best.length) best = t;
    }
  });
  return best ? best.slice(0, maxLen) : '';
}

// POST /api/chat/follow - Seguir uma empresa (candidato → empresa)
router.post('/follow', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { companyId } = req.body;

    // Verificar se é candidato
    if (req.user.type !== 'candidate') {
      return res.status(403).json({ error: 'Apenas candidatos podem seguir empresas' });
    }

    // Verificar se a empresa existe
    const companyCheck = await pool.query(
      'SELECT id, company_name FROM users WHERE id = $1 AND type = $2',
      [companyId, 'company']
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Inserir ou ignorar se já existe
    await pool.query(
      `INSERT INTO company_follows (candidate_id, company_id) 
       VALUES ($1, $2) 
       ON CONFLICT (candidate_id, company_id) DO NOTHING`,
      [candidateId, companyId]
    );

    // Criar conversa se não existir
    await pool.query(
      `INSERT INTO conversations (candidate_id, company_id) 
       VALUES ($1, $2) 
       ON CONFLICT (candidate_id, company_id) DO NOTHING`,
      [candidateId, companyId]
    );

    res.json({ message: 'Empresa seguida com sucesso!' });
  } catch (error) {
    console.error('Erro ao seguir empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/chat/save-candidate - Empresa salvar candidato (empresa → candidato)
router.post('/save-candidate', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.id;
    const { candidateId } = req.body;

    // Verificar se é empresa
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Apenas empresas podem salvar candidatos' });
    }

    // Verificar se o candidato existe
    const candidateCheck = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND type = $2',
      [candidateId, 'candidate']
    );

    if (candidateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }

    // Criar conversa se não existir (empresa salvando candidato)
    await pool.query(
      `INSERT INTO conversations (candidate_id, company_id) 
       VALUES ($1, $2) 
       ON CONFLICT (candidate_id, company_id) DO NOTHING`,
      [candidateId, companyId]
    );

    res.json({ message: 'Candidato salvo com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar candidato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/chat/save-student - Escola salvar aluno (escola → candidato)
router.post('/save-student', authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { candidateId } = req.body;

    // Verificar se é escola
    if (req.user.type !== 'school') {
      return res.status(403).json({ error: 'Apenas escolas podem salvar alunos' });
    }

    // Verificar se o candidato existe
    const candidateCheck = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND type = $2',
      [candidateId, 'candidate']
    );

    if (candidateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Criar conversa se não existir (escola salvando aluno)
    await pool.query(
      `INSERT INTO conversations (candidate_id, company_id) 
       VALUES ($1, $2) 
       ON CONFLICT (candidate_id, company_id) DO NOTHING`,
      [candidateId, schoolId]
    );

    res.json({ message: 'Aluno salvo com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar aluno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/chat/unfollow - Parar de seguir uma empresa
router.delete('/unfollow', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { companyId } = req.body;

    await pool.query(
      'DELETE FROM company_follows WHERE candidate_id = $1 AND company_id = $2',
      [candidateId, companyId]
    );

    res.json({ message: 'Parou de seguir a empresa com sucesso!' });
  } catch (error) {
    console.error('Erro ao parar de seguir empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/chat/conversations - Buscar conversas do usuário
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;

    console.log('🔍 Chat conversations - userId:', userId, 'userType:', userType);

    let query;
    let params;

    if (userType === 'candidate') {
      // Garante que o candidato tenha uma conversa com sua escola (se for aluno)
      try {
        const sch = await pool.query('SELECT school_id FROM students WHERE user_id=$1 LIMIT 1',[userId]);
        if(sch.rows.length>0 && sch.rows[0].school_id){
          await pool.query(
            `INSERT INTO conversations (candidate_id, company_id)
             VALUES ($1, $2)
             ON CONFLICT (candidate_id, company_id) DO NOTHING`,
            [userId, sch.rows[0].school_id]
          );
        }
      } catch(e){ console.warn('Não foi possível garantir conversa aluno↔escola', e.message); }
      // Para candidatos: mostrar empresas que eles seguem
      query = `
        SELECT 
          c.*,
          COALESCE(u.company_name, u.school_name, u.name) as contact_name,
          u.email as contact_email,
          COALESCE(u.school_contact_phone, u.phone) as contact_phone,
          u.profile_image as contact_profile_image,
          (SELECT message FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message,
          (SELECT sender_id FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_sender_id,
          (SELECT COUNT(*) FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           AND cm.sender_id != $1 
           AND cm.read_at IS NULL) as unread_count
        FROM conversations c
        JOIN users u ON c.company_id = u.id
        WHERE c.candidate_id = $1
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    } else if (userType === 'company') {
      // Para empresas: mostrar candidatos que as seguem
      query = `
        SELECT 
          c.*,
          u.name as contact_name,
          u.email as contact_email,
          u.phone as contact_phone,
          u.profile_image as contact_profile_image,
          sch.name as school_name,
          sch.profile_image as school_profile_image,
          (SELECT message FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message,
          (SELECT sender_id FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_sender_id,
          (SELECT COUNT(*) FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           AND cm.sender_id != $1 
           AND cm.read_at IS NULL) as unread_count
        FROM conversations c
        JOIN users u ON c.candidate_id = u.id
        LEFT JOIN students st ON st.user_id = u.id
        LEFT JOIN users sch ON sch.id = st.school_id
        WHERE c.company_id = $1
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    } else if (userType === 'school') {
      // Para escolas: listar conversas com seus alunos (candidatos)
      query = `
        SELECT 
          c.*,
          u.name as contact_name,
          u.email as contact_email,
          u.phone as contact_phone,
          u.profile_image as contact_profile_image,
          (SELECT message FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message,
          (SELECT sender_id FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_sender_id,
          (SELECT COUNT(*) FROM conversation_messages cm 
           WHERE cm.conversation_id = c.id 
           AND cm.sender_id != $1 
           AND cm.read_at IS NULL) as unread_count
        FROM conversations c
        JOIN users u ON c.candidate_id = u.id
        WHERE c.company_id = $1
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    } else {
      return res.status(403).json({ error: 'Tipo de usuário não autorizado' });
    }

    const result = await pool.query(query, params);
    
    console.log('🔍 Chat conversations - raw result rows:', result.rows.length);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.contact_name} - Phone: ${row.contact_phone || 'NULL'}`);
    });

    const conversations = result.rows.map(row => ({
      id: row.id,
      candidateId: row.candidate_id,
      companyId: row.company_id,
      lastMessageAt: row.last_message_at,
      lastMessage: row.last_message,
  lastMessageSenderId: row.last_sender_id,
      unreadCount: parseInt(row.unread_count) || 0,
      // Dados do contato (empresa ou candidato)
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      contactProfileImage: row.contact_profile_image,
      // Dados da escola (para candidatos)
      schoolName: row.school_name,
      schoolProfileImage: row.school_profile_image
    }));

    console.log('🔍 Chat conversations - mapped conversations:');
    conversations.forEach((conv, index) => {
      console.log(`   ${index + 1}. ${conv.contactName} - contactPhone: ${conv.contactPhone || 'NULL'}`);
    });

    // Adicionar cabeçalho para evitar cache
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json(conversations);
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/chat/messages/:conversationId - Buscar mensagens de uma conversa
router.get('/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verificar se o usuário faz parte da conversa
    const conversationCheck = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (candidate_id = $2 OR company_id = $2)',
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta conversa' });
    }

    // Buscar mensagens
    const query = `
      SELECT 
        cm.*,
        u.name,
        u.company_name,
        u.type as sender_type
      FROM conversation_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = $1
      ORDER BY cm.created_at ASC
    `;

    const result = await pool.query(query, [conversationId]);

    const messages = result.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      message: row.message,
      readAt: row.read_at,
      createdAt: row.created_at,
      senderName: row.sender_type === 'company' ? row.company_name : row.name,
      senderType: row.sender_type,
      isFromMe: row.sender_id === userId
    }));

    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/chat/messages - Enviar uma mensagem
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, message } = req.body;

    // Verificar se o usuário faz parte da conversa
    const conversationCheck = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (candidate_id = $2 OR company_id = $2)',
      [conversationId, senderId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta conversa' });
    }

    // Inserir mensagem
    const result = await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_id, message) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [conversationId, senderId, message]
    );

    // Atualizar última mensagem da conversa
    await pool.query(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
      [conversationId]
    );

    const newMessage = result.rows[0];

    res.json({
      id: newMessage.id,
      conversationId: newMessage.conversation_id,
      senderId: newMessage.sender_id,
      message: newMessage.message,
      createdAt: newMessage.created_at,
      isFromMe: true
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/chat/messages/:messageId/read - Marcar mensagem como lida
router.put('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Marcar como lida apenas se não for o remetente
    await pool.query(
      `UPDATE conversation_messages 
       SET read_at = NOW() 
       WHERE id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [messageId, userId]
    );

    res.json({ message: 'Mensagem marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/chat/messages/:messageId - Excluir mensagem
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Verificar se a mensagem pertence ao usuário (ele é o remetente)
    const messageResult = await pool.query(
      'SELECT * FROM conversation_messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    const message = messageResult.rows[0];

    // Só permitir deletar se for o remetente
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Você só pode excluir suas próprias mensagens' });
    }

    // Excluir a mensagem
    await pool.query('DELETE FROM conversation_messages WHERE id = $1', [messageId]);

    res.json({ success: true, message: 'Mensagem excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/chat/conversations/:conversationId - Excluir conversa inteira
router.delete('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verificar se a conversa pertence ao usuário
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
      [conversationId, userId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Excluir todas as mensagens da conversa
    await pool.query('DELETE FROM conversation_messages WHERE conversation_id = $1', [conversationId]);

    // Excluir a conversa
    await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);

    res.json({ success: true, message: 'Conversa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/chat/follow-status/:companyId - Verificar se candidato segue empresa
router.get('/follow-status/:companyId', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { companyId } = req.params;

    if (req.user.type !== 'candidate') {
      return res.json({ isFollowing: false });
    }

    const result = await pool.query(
      'SELECT 1 FROM company_follows WHERE candidate_id = $1 AND company_id = $2',
      [candidateId, companyId]
    );

    res.json({ isFollowing: result.rows.length > 0 });
  } catch (error) {
    console.error('Erro ao verificar status de seguimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
