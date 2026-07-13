import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken, optionalAuth, requireCompany, requireAdmin } from '../middleware/auth.js';
import { JOB_TAXONOMY, ALL_AREAS, isValidArea, isValidSubarea } from '../config/jobTaxonomy.js';
import { checkSubscriptionPlan, validateCompanyVerification, validateJobPostingLimit } from '../middleware/checkSubscriptionPlan.js';
import { notifyNewJobAlert } from '../services/notificationService.js';
import { calculateJobMatch, formatResumeForAnalysis } from '../services/aiService.js';

// Inicializar router antes de qualquer uso
const router = express.Router();
// --- Proteção contra contagem dupla de visualizações (dedup curto por usuário/IP+UA) ---
const recentViewKeys = new Map(); // key -> timestamp(ms)
const VIEW_DEDUP_WINDOW_MS = 60 * 1000; // 1 minuto
const VIEW_PURGE_AFTER_MS = 10 * 60 * 1000; // 10 minutos

function shouldCountView(jobId, req) {
  try {
    const ua = (req.headers['user-agent'] || '').slice(0, 80);
    const uid = req.user?.id ? `u:${req.user.id}` : `ip:${req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown'}`;
    const key = `${jobId}|${uid}|${ua}`;
    const now = Date.now();
    const last = recentViewKeys.get(key);
    if (last && (now - last) < VIEW_DEDUP_WINDOW_MS) return false;
    recentViewKeys.set(key, now);
    // Limpeza eventual para evitar crescimento indefinido
    if (recentViewKeys.size > 10000) {
      const cutoff = now - VIEW_PURGE_AFTER_MS;
      for (const [k, ts] of recentViewKeys) {
        if (ts < cutoff) recentViewKeys.delete(k);
      }
    }
    return true;
  } catch (e) {
    return true;
  }
}

// --- Garantir tabela de visualizações diárias e utilidades ---
let ensuredJobViews = false;
async function ensureJobViewsTable() {
  if (ensuredJobViews) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_views (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        ip_hash TEXT NULL,
        user_agent_hash TEXT NULL,
        viewed_on DATE NOT NULL DEFAULT CURRENT_DATE
      );
      CREATE INDEX IF NOT EXISTS idx_job_views_comp ON job_views(job_id, user_id, viewed_on);
      CREATE INDEX IF NOT EXISTS idx_job_views_anon ON job_views(job_id, ip_hash, user_agent_hash, viewed_on);
    `);
    ensuredJobViews = true;
  } catch (e) {
    console.error('Erro garantindo tabela job_views:', e?.message || e);
  }
}

function simpleHash(s) {
  try {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  } catch {
    return '0';
  }
}
// ===== Destaques de vagas por escolas =====
let ensuredHighlights = false;
const ensureJobHighlights = async () => {
  if (ensuredHighlights) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_highlights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NULL REFERENCES school_classes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, school_id, class_id)
      );
      CREATE INDEX IF NOT EXISTS idx_job_highlights_job ON job_highlights(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_highlights_school ON job_highlights(school_id);
      CREATE INDEX IF NOT EXISTS idx_job_highlights_class ON job_highlights(class_id);
    `);
    ensuredHighlights = true;
  } catch (e) { console.error('Erro garantindo tabela job_highlights:', e.message); }
};

// ===== Destaques diretos da empresa (plano premium) =====
let ensuredCompanyHighlights = false;
const ensureCompanyHighlights = async () => {
  if (ensuredCompanyHighlights) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_company_highlights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, company_id, school_id, class_id)
      );
      CREATE INDEX IF NOT EXISTS idx_jch_job ON job_company_highlights(job_id);
      CREATE INDEX IF NOT EXISTS idx_jch_company ON job_company_highlights(company_id);
      CREATE INDEX IF NOT EXISTS idx_jch_school ON job_company_highlights(school_id);
      CREATE INDEX IF NOT EXISTS idx_jch_class ON job_company_highlights(class_id);
    `);
    ensuredCompanyHighlights = true;
  } catch (e) { console.error('Erro garantindo tabela job_company_highlights:', e.message); }
};

// ====== RECOMMENDATIONS (school indicates students to a job) ======
let ensuredRecommendations = false;
const ensureRecommendations = async () => {
  if (ensuredRecommendations) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_school_recommendations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID NULL REFERENCES school_classes(id) ON DELETE SET NULL,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(job_id, school_id, student_id)
      );
      CREATE INDEX IF NOT EXISTS idx_jsr_job ON job_school_recommendations(job_id);
      CREATE INDEX IF NOT EXISTS idx_jsr_school ON job_school_recommendations(school_id);
      CREATE INDEX IF NOT EXISTS idx_jsr_class ON job_school_recommendations(class_id);
      CREATE INDEX IF NOT EXISTS idx_jsr_student ON job_school_recommendations(student_id);
    `);
    ensuredRecommendations = true;
  } catch (e) {
    console.error('Erro garantindo tabela job_school_recommendations:', e.message);
  }
};

// ===== Solicitações de destaque (empresa -> escola) =====
let ensuredHighlightRequests = false;
const ensureHighlightRequests = async () => {
  if (ensuredHighlightRequests) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_highlight_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        decided_at TIMESTAMP NULL,
        UNIQUE(job_id, company_id, school_id, status)
      );
      CREATE INDEX IF NOT EXISTS idx_jhr_school_status ON job_highlight_requests(school_id, status);
      CREATE INDEX IF NOT EXISTS idx_jhr_company ON job_highlight_requests(company_id);
    `);
    ensuredHighlightRequests = true;
  } catch (e) { console.error('Erro garantindo tabela job_highlight_requests:', e.message); }
};

// POST /api/jobs/:id/highlight  (school seleciona turmas)
router.post('/:id/highlight', authenticateToken, async (req, res) => {
  try {
    await ensureJobHighlights();
    if (req.user.type !== 'school') return res.status(403).json({ error: 'Somente escolas' });
    const jobId = req.params.id;
    const { classIds = [] } = req.body;
    if (!Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({ error: 'Informe pelo menos uma turma' });
    }
    // Validar turmas pertencem à escola
    const classesResult = await pool.query('SELECT id FROM school_classes WHERE school_id = $1 AND id = ANY($2)', [req.user.id, classIds]);
    const validIds = classesResult.rows.map(r => r.id);
    if (validIds.length === 0) return res.status(400).json({ error: 'Turmas inválidas' });
    // Inserir (ignorar duplicadas)
    for (const cid of validIds) {
      await pool.query(`INSERT INTO job_highlights (job_id, school_id, class_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [jobId, req.user.id, cid]);
    }
    res.json({ success: true, added: validIds.length });
  } catch (e) {
    console.error('Erro ao destacar vaga:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/jobs/:id/company-highlight  (empresa premium destaca diretamente até 3 turmas no total por vaga)
router.post('/:id/company-highlight', authenticateToken, async (req, res) => {
  try {
    await ensureCompanyHighlights();
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Somente empresas' });
    const jobId = req.params.id;
    const { schoolId, classId } = req.body || {};
    if (!schoolId || !classId) return res.status(400).json({ error: 'schoolId e classId são obrigatórios' });

    // Plano premium para todas empresas - verificação removida

    // Validar vaga pertence à empresa
    const job = await pool.query('SELECT id, company_id FROM jobs WHERE id=$1', [jobId]);
    if (job.rows.length === 0) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (job.rows[0].company_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão nesta vaga' });

    // Validar escola
    const school = await pool.query("SELECT id FROM users WHERE id=$1 AND type='school' AND COALESCE(disabled,false)=false", [schoolId]);
    if (school.rows.length === 0) return res.status(400).json({ error: 'Escola inválida' });

    // Validar turma pertence à escola
    const clazz = await pool.query('SELECT id FROM school_classes WHERE id=$1 AND school_id=$2', [classId, schoolId]);
    if (clazz.rows.length === 0) return res.status(400).json({ error: 'Turma inválida para a escola' });

    // Limite de até 3 turmas destacadas por vaga pela própria empresa
    const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM job_company_highlights WHERE job_id=$1 AND company_id=$2', [jobId, req.user.id]);
    if (countRes.rows[0].count >= 3) {
      return res.status(403).json({ error: 'Limite de 3 turmas destacadas atingido para esta vaga', code: 'COMPANY_HIGHLIGHT_LIMIT' });
    }

    // Evitar duplicado
    const existing = await pool.query('SELECT id FROM job_company_highlights WHERE job_id=$1 AND company_id=$2 AND school_id=$3 AND class_id=$4', [jobId, req.user.id, schoolId, classId]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Já destacado para esta turma' });

    const ins = await pool.query('INSERT INTO job_company_highlights (job_id, company_id, school_id, class_id) VALUES ($1,$2,$3,$4) RETURNING id, created_at', [jobId, req.user.id, schoolId, classId]);
    const newCount = countRes.rows[0].count + 1;
    res.json({ success: true, highlight: { id: ins.rows[0].id, created_at: ins.rows[0].created_at }, total: newCount, remaining: Math.max(0, 3 - newCount) });
  } catch (e) {
    console.error('Erro ao destacar diretamente (empresa):', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/:id/company-highlights (empresa vê seus destaques da vaga)
router.get('/:id/company-highlights', authenticateToken, async (req, res) => {
  try {
    await ensureCompanyHighlights();
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Somente empresas' });
    const jobId = req.params.id;
    const job = await pool.query('SELECT id, company_id FROM jobs WHERE id=$1', [jobId]);
    if (job.rows.length === 0) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (job.rows[0].company_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });
    const r = await pool.query(`
      SELECT h.id, h.school_id, h.class_id, h.created_at, s.school_name, c.name as class_name
      FROM job_company_highlights h
      JOIN users s ON s.id = h.school_id
      JOIN school_classes c ON c.id = h.class_id
      WHERE h.job_id=$1 AND h.company_id=$2
      ORDER BY h.created_at DESC
    `, [jobId, req.user.id]);
    res.json({ success: true, highlights: r.rows });
  } catch (e) {
    console.error('Erro listando company highlights:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/company-highlight/schools  (empresas premium: listar escolas disponíveis)
router.get('/company-highlight/schools', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Somente empresas' });
    // Plano premium para todas empresas - verificação removida
    const schools = await pool.query("SELECT id, school_name FROM users WHERE type='school' AND COALESCE(disabled,false)=false ORDER BY school_name ASC");
    res.json({ schools: schools.rows });
  } catch (e) {
    console.error('Erro listando escolas para highlight direto:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/company-highlight/schools/:schoolId/classes  (listar turmas de uma escola)
router.get('/company-highlight/schools/:schoolId/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Somente empresas' });
    // Plano premium para todas empresas - verificação removida
    const schoolId = req.params.schoolId;
    const school = await pool.query("SELECT id FROM users WHERE id=$1 AND type='school' AND COALESCE(disabled,false)=false", [schoolId]);
    if (school.rows.length === 0) return res.status(404).json({ error: 'Escola não encontrada' });
    const classes = await pool.query('SELECT id, name FROM school_classes WHERE school_id=$1 ORDER BY name ASC', [schoolId]);
    res.json({ classes: classes.rows });
  } catch (e) {
    console.error('Erro listando turmas para highlight direto:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/jobs/:id/request-highlight  (company -> school)
router.post('/:id/request-highlight', authenticateToken, async (req, res) => {
  try {
    await ensureHighlightRequests();
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Somente empresas' });
    const jobId = req.params.id;
    const { schoolId, message } = req.body || {};
    if (!schoolId) return res.status(400).json({ error: 'schoolId é obrigatório' });
    // Validar que a vaga pertence à empresa
    const job = await pool.query('SELECT id, company_id FROM jobs WHERE id=$1', [jobId]);
    if (job.rows.length === 0) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (job.rows[0].company_id !== req.user.id) return res.status(403).json({ error: 'Você não pode solicitar destaque para uma vaga de outra empresa' });
    // Validar escola
    const school = await pool.query("SELECT id FROM users WHERE id=$1 AND type='school' AND COALESCE(disabled,false)=false", [schoolId]);
    if (school.rows.length === 0) return res.status(400).json({ error: 'Escola inválida' });
    // Verificar se já existe pendente
    const pend = await pool.query('SELECT id FROM job_highlight_requests WHERE job_id=$1 AND company_id=$2 AND school_id=$3 AND status=$4', [jobId, req.user.id, schoolId, 'pending']);
    if (pend.rows.length > 0) return res.status(409).json({ error: 'Já existe uma solicitação pendente para esta escola' });
    const ins = await pool.query(
      'INSERT INTO job_highlight_requests (job_id, company_id, school_id, message, status) VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at',
      [jobId, req.user.id, schoolId, message || null, 'pending']
    );
    res.json({ success: true, request: { id: ins.rows[0].id, status: 'pending', created_at: ins.rows[0].created_at } });
  } catch (e) {
    console.error('Erro ao solicitar destaque:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/highlight-requests (company) - minhas solicitações
router.get('/highlight-requests', authenticateToken, async (req, res) => {
  try {
    await ensureHighlightRequests();
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Somente empresas' });
    const r = await pool.query(`
      SELECT r.id, r.status, r.message, r.reason, r.created_at, r.decided_at,
             r.job_id, j.title as job_title,
             r.school_id, s.school_name AS school_name
      FROM job_highlight_requests r
      JOIN jobs j ON j.id = r.job_id
      JOIN users s ON s.id = r.school_id
      WHERE r.company_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, requests: r.rows });
  } catch (e) {
    console.error('Erro listando solicitações (empresa):', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/highlight-requests/pending (school) - pendentes para escola
router.get('/highlight-requests/pending', authenticateToken, async (req, res) => {
  try {
    await ensureHighlightRequests();
    if (req.user.type !== 'school') return res.status(403).json({ error: 'Somente escolas' });
    const r = await pool.query(`
      SELECT r.id, r.status, r.message, r.created_at,
             r.job_id, j.title as job_title,
             r.company_id, c.company_name, c.profile_image as company_avatar
      FROM job_highlight_requests r
      JOIN jobs j ON j.id = r.job_id
      JOIN users c ON c.id = r.company_id
      WHERE r.school_id = $1 AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, requests: r.rows });
  } catch (e) {
    console.error('Erro listando solicitações (escola):', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/jobs/highlight-requests/:id/approve (school) - aprovar e criar destaques
router.post('/highlight-requests/:id/approve', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureHighlightRequests();
    await ensureJobHighlights();
    await ensureCompanyHighlights();
    if (req.user.type !== 'school') return res.status(403).json({ error: 'Somente escolas' });
    const reqId = req.params.id;
    const { classIds = [] } = req.body || {};
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM job_highlight_requests WHERE id=$1 FOR UPDATE', [reqId]);
    if (r.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Solicitação não encontrada' }); }
    const row = r.rows[0];
    if (row.school_id !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Sem permissão' }); }
    if (row.status !== 'pending') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Solicitação já processada' }); }
    // Validar turmas pertencem à escola se fornecidas
    let validClassIds = [];
    if (Array.isArray(classIds) && classIds.length > 0) {
      const cr = await client.query('SELECT id FROM school_classes WHERE school_id=$1 AND id = ANY($2)', [req.user.id, classIds]);
      validClassIds = cr.rows.map(x => x.id);
    }
    // Se a aprovação especificar turmas, registra como destaque da EMPRESA (para aparecer em "Pelas empresas").
    // Se nenhuma turma for informada, mantém o comportamento de destaque geral pela escola (class_id NULL).
    if (validClassIds.length > 0) {
      for (const cid of validClassIds) {
        await client.query(
          `INSERT INTO job_company_highlights (job_id, company_id, school_id, class_id)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (job_id, company_id, school_id, class_id) DO NOTHING`,
          [row.job_id, row.company_id, row.school_id, cid]
        );
      }
    } else {
      await client.query(
        'INSERT INTO job_highlights (job_id, school_id, class_id) VALUES ($1,$2,NULL) ON CONFLICT DO NOTHING',
        [row.job_id, row.school_id]
      );
    }
    await client.query("UPDATE job_highlight_requests SET status='approved', decided_at=NOW() WHERE id=$1", [reqId]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro aprovando solicitação de destaque:', e);
    res.status(500).json({ error: 'Erro interno' });
  } finally { client.release(); }
});

// POST /api/jobs/highlight-requests/:id/reject (school)
router.post('/highlight-requests/:id/reject', authenticateToken, async (req, res) => {
  try {
    await ensureHighlightRequests();
    if (req.user.type !== 'school') return res.status(403).json({ error: 'Somente escolas' });
    const reqId = req.params.id;
    const { reason } = req.body || {};
    const r = await pool.query("UPDATE job_highlight_requests SET status='rejected', reason=$1, decided_at=NOW() WHERE id=$2 AND school_id=$3 AND status='pending' RETURNING id", [reason || null, reqId, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Solicitação não encontrada ou já processada' });
    res.json({ success: true });
  } catch (e) {
    console.error('Erro rejeitando solicitação de destaque:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/highlights (para aluno ver ids destacados pela sua escola/turma)
router.get('/highlights/mine', authenticateToken, async (req, res) => {
  try {
    await ensureJobHighlights();
    await ensureCompanyHighlights();
    if (req.user.type !== 'candidate') return res.json({ jobs: [] });
    // descobrir school_id e class_id do aluno
    const stu = await pool.query('SELECT class_id, school_id FROM students WHERE user_id = $1', [req.user.id]);
    if (stu.rows.length === 0) return res.json({ jobs: [] });
    const { class_id, school_id } = stu.rows[0];
    const schoolRes = await pool.query(`
      SELECT DISTINCT jh.job_id FROM job_highlights jh
      JOIN jobs j ON jh.job_id = j.id
      WHERE jh.school_id = $1 AND (jh.class_id = $2 OR jh.class_id IS NULL) AND j.is_active = TRUE
    `, [school_id, class_id]);
    const companyRes = await pool.query(`
      SELECT DISTINCT jch.job_id FROM job_company_highlights jch
      JOIN jobs j ON jch.job_id = j.id
      WHERE jch.school_id = $1 AND jch.class_id = $2 AND j.is_active = TRUE
    `, [school_id, class_id]);
    const schoolJobs = schoolRes.rows.map(r => r.job_id);
    const companyJobs = companyRes.rows.map(r => r.job_id);
    const union = Array.from(new Set([...schoolJobs, ...companyJobs]));
    res.json({ jobs: union, schoolJobs, companyJobs });
  } catch (e) {
    console.error('Erro listando destaques:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});
// router já inicializado acima

// NOTE: `requireAdmin` is provided by backend/middleware/auth.js — imported above.

// ===== Garantir colunas extras (lazy migration) =====
let ensuredJobExtraColumns = false;
const ensureJobExtraColumns = async () => {
  if (ensuredJobExtraColumns) return;
  try {
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_first_job BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category VARCHAR(255)');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS area VARCHAR(100)');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subarea VARCHAR(100)');
    // Community jobs support
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS community_company_name VARCHAR(255)');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS community_submission_methods JSONB');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS community_contact_methods JSONB');
  await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20)');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_fixed DECIMAL(10,2)');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES users(id) ON DELETE SET NULL');
    // Agency jobs support
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_agency_job BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url TEXT');
    await pool.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES users(id) ON DELETE SET NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_jobs_area ON jobs(area)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_jobs_subarea ON jobs(subarea)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_jobs_is_first_job ON jobs(is_first_job)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_jobs_is_community ON jobs(is_community)');
    ensuredJobExtraColumns = true;
  } catch (e) {
    console.error('Erro garantindo colunas extras de vaga:', e.message);
  }
};

// Endpoint de taxonomia
router.get('/taxonomy', (req, res) => {
  res.json({ taxonomy: JOB_TAXONOMY, areas: ALL_AREAS });
});

// POST /api/jobs/community - Criar vaga da comunidade (admin)
router.post('/community', [
  authenticateToken,
  requireAdmin,
  body('company_name').notEmpty().withMessage('Nome da empresa é obrigatório'),
  body('title').notEmpty().withMessage('Título da vaga é obrigatório'),
  body('area').notEmpty().withMessage('Área é obrigatória').custom(v => isValidArea(v)).withMessage('Área inválida'),
  body('subarea').optional().custom((v,{req}) => {
    if (!v) return true;
    if (!isValidArea(req.body.area)) throw new Error('Área inválida');
    if (!isValidSubarea(req.body.area, v)) throw new Error('Subárea inválida para a área informada');
    return true;
  }),
  body('location').notEmpty().withMessage('Localização é obrigatória'),
  body('description').notEmpty().withMessage('Descrição da vaga é obrigatória'),
  body('requirements').notEmpty().withMessage('Requisitos são obrigatórios'),
  body('no_experience_required').optional().isBoolean(),
  body('salary_type').optional().isIn(['range','fixed','hidden']),
  body('salary_min').optional().isFloat({ min: 0 }),
  body('salary_max').optional().isFloat({ min: 0 }),
  body('salary_fixed').optional().isFloat({ min: 0 }),
  body('contract_type').optional().isString(),
  body('experience_level').optional().isString(),
  body('work_type').optional().isString(),
  body('benefits').optional().isString(),
  body('submission_methods').isArray({ min: 1 }).withMessage('Informe ao menos uma forma de envio do currículo'),
  body('contact_methods').optional().isArray()
], async (req, res) => {
  try {
    await ensureJobExtraColumns();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company_name,
      title,
      area,
      subarea,
      location,
      description,
      requirements,
      no_experience_required,
      salary_type,
      salary_min,
      salary_max,
      salary_fixed,
      contract_type,
      experience_level,
      work_type,
      benefits,
      submission_methods,
      contact_methods
    } = req.body;

    // Normalizar campos enumerados para evitar violar CHECK constraints do banco
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : null);
    const allowedContract = ['clt','pj','estagio','temporario'];
    const allowedWorkType = ['presencial','remoto','hibrido'];
    const allowedExperience = ['junior','pleno','senior','estagio'];

    const finalContractType = allowedContract.includes(norm(contract_type)) ? norm(contract_type) : null;
    const finalWorkType = allowedWorkType.includes(norm(work_type)) ? norm(work_type) : null;
    const finalExperience = allowedExperience.includes(norm(experience_level)) ? norm(experience_level) : null;

    // Validar salário conforme tipo
    let finalSalaryMin = null, finalSalaryMax = null, finalSalaryFixed = null;
    if (salary_type === 'range') {
      finalSalaryMin = salary_min ?? null;
      finalSalaryMax = salary_max ?? null;
    } else if (salary_type === 'fixed') {
      finalSalaryFixed = salary_fixed ?? null;
    }

    const insert = await pool.query(`
      INSERT INTO jobs (
        company_id, title, description, requirements, benefits,
        salary_min, salary_max, salary_fixed, salary_type, location,
        work_type, contract_type, experience_level, is_first_job,
        category, area, subarea, is_active,
        is_community, community_company_name, community_submission_methods, community_contact_methods, created_by_admin
      ) VALUES (
        NULL, $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        NULL, $14, $15, TRUE,
        TRUE, $16, $17, $18, $19
      ) RETURNING *
    `, [
      title,
      description,
      requirements,
      benefits || null,
      finalSalaryMin,
      finalSalaryMax,
      finalSalaryFixed,
      salary_type || null,
      location,
  finalWorkType,
  finalContractType,
  finalExperience,
      !!no_experience_required,
      area,
      subarea || null,
      company_name,
      JSON.stringify(submission_methods || []),
      JSON.stringify(contact_methods || []),
      req.user.id
    ]);

    const job = insert.rows[0];
    res.status(201).json({ job: {
      ...job,
      salary_min: job.salary_min ? parseFloat(job.salary_min) : null,
      salary_max: job.salary_max ? parseFloat(job.salary_max) : null,
      salary_fixed: job.salary_fixed ? parseFloat(job.salary_fixed) : null,
      company_name: job.community_company_name
    }});
  } catch (e) {
    console.error('Erro criando vaga da comunidade:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/community - Listar vagas da comunidade (admin)
router.get('/community', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureJobExtraColumns();
    const r = await pool.query(`
      SELECT 
        j.*, 
        COALESCE(u.company_name, j.community_company_name) AS company_name,
        u.email as company_email
      FROM jobs j
      LEFT JOIN users u ON j.company_id = u.id
      WHERE j.is_community = TRUE
      ORDER BY j.created_at DESC
    `);
    const jobs = r.rows.map(job => ({
      ...job,
      salary_min: job.salary_min ? parseFloat(job.salary_min) : null,
      salary_max: job.salary_max ? parseFloat(job.salary_max) : null,
      salary_fixed: job.salary_fixed ? parseFloat(job.salary_fixed) : null,
    }));
    res.json({ jobs });
  } catch (e) {
    console.error('Erro listando vagas da comunidade (admin):', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs/companies-with-jobs - Listar empresas com vagas ativas
router.get('/companies-with-jobs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.company_name,
        u.profile_image,
        u.location,
        COUNT(j.id) as active_jobs
      FROM users u
      INNER JOIN jobs j ON j.company_id = u.id AND j.is_active = true
      WHERE u.type = 'company' AND (u.disabled = false OR u.disabled IS NULL)
      GROUP BY u.id, u.company_name, u.profile_image, u.location
      HAVING COUNT(j.id) > 0
      ORDER BY COUNT(j.id) DESC
      LIMIT 20
    `);
    res.json({ companies: result.rows });
  } catch (e) {
    console.error('Erro listando empresas com vagas:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/jobs - Listar todas as vagas (públicas)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('search').optional().isString().trim(),
  query('location').optional().isString().trim(),
  query('work_type').optional().isIn(['presencial', 'remoto', 'hibrido']),
  query('contract_type').optional().isIn(['clt', 'pj', 'estagio', 'temporario', 'freelancer']),
  query('experience_level').optional().isIn(['junior', 'pleno', 'senior', 'estagio']),
  query('company_id').optional().isUUID(),
  query('area').optional().custom(v => isValidArea(v)).withMessage('Área inválida'),
  query('subarea').optional().isString()
], async (req, res) => {
  try {
  await ensureJobExtraColumns();
    console.log('🔍 GET /api/jobs - Request recebido');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 500,
      search,
      location,
      work_type,
      contract_type,
      experience_level,
  company_id,
  area,
  subarea
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['j.is_active = TRUE', '(u.disabled = FALSE OR u.disabled IS NULL)'];
    let queryParams = [];
    let paramCount = 0;

    // Filtro de busca ampliado: título, empresa, descrição, requisitos, benefícios e área
    if (search) {
      paramCount++;
      whereConditions.push(`(
        j.title ILIKE $${paramCount} OR 
        u.company_name ILIKE $${paramCount} OR
        j.description ILIKE $${paramCount} OR
        j.requirements ILIKE $${paramCount} OR
        j.benefits ILIKE $${paramCount} OR
        j.area ILIKE $${paramCount} OR
        j.subarea ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    // Filtro por localização
    if (location) {
      paramCount++;
      whereConditions.push(`j.location ILIKE $${paramCount}`);
      queryParams.push(`%${location}%`);
    }

    // Filtro por tipo de trabalho
    if (work_type) {
      paramCount++;
      whereConditions.push(`j.work_type = $${paramCount}`);
      queryParams.push(work_type);
    }

    // Filtro por tipo de contrato
    if (contract_type) {
      paramCount++;
      whereConditions.push(`j.contract_type = $${paramCount}`);
      queryParams.push(contract_type);
    }

    // Filtro por nível de experiência
    if (experience_level) {
      paramCount++;
      whereConditions.push(`j.experience_level = $${paramCount}`);
      queryParams.push(experience_level);
    }

    // Filtro por empresa
    if (company_id) {
      paramCount++;
      whereConditions.push(`j.company_id = $${paramCount}`);
      queryParams.push(company_id);
    }

    if (area) {
      paramCount++;
      whereConditions.push(`j.area = $${paramCount}`);
      queryParams.push(area);
    }

    if (subarea) {
      paramCount++;
      whereConditions.push(`j.subarea = $${paramCount}`);
      queryParams.push(subarea);
    }

    const whereClause = whereConditions.join(' AND ');

    // Query para buscar vagas com informações da empresa
    const jobsQuery = `
      SELECT 
        j.*,
        COALESCE(u.company_name, j.community_company_name) AS company_name,
        u.email as company_email,
        u.company_sector,
        u.company_size,
        u.profile_image as company_logo
      FROM jobs j
      LEFT JOIN users u ON j.company_id = u.id
      WHERE ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(limit, offset);

    // Query para contar total de vagas
    const countQuery = `
      SELECT COUNT(*) as total
      FROM jobs j
      LEFT JOIN users u ON j.company_id = u.id
      WHERE ${whereClause}
    `;

    // Parâmetros para a query de jobs (com limit e offset)
    const jobsParams = [...queryParams.slice(0, -2), limit, offset];
    // Parâmetros para a query de count (sem limit e offset)
    const countParams = queryParams.slice(0, -2);

    const [jobsResult, countResult] = await Promise.all([
      pool.query(jobsQuery, jobsParams),
      pool.query(countQuery, countParams)
    ]);

    const jobs = jobsResult.rows.map(job => ({
      ...job,
      salary_min: job.salary_min ? parseFloat(job.salary_min) : null,
      salary_max: job.salary_max ? parseFloat(job.salary_max) : null,
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/jobs/company - Listar vagas da empresa atual
router.get('/company', authenticateToken, requireCompany, async (req, res) => {
  try {
    console.log('🏢 GET /api/jobs/company - Usuário:', req.user.id, req.user.email);
    
    const query = `
      SELECT 
        j.*,
        u.company_name,
        u.email as company_email
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      WHERE j.company_id = $1
      ORDER BY j.created_at DESC
    `;

    console.log('🔍 Query para buscar jobs da empresa:', req.user.id);
    const result = await pool.query(query, [req.user.id]);
    console.log('📋 Jobs encontrados:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('🔍 Primeiro job:', result.rows[0]);
    }

    const jobs = result.rows.map(job => ({
      ...job,
      salary_min: job.salary_min ? parseFloat(job.salary_min) : null,
      salary_max: job.salary_max ? parseFloat(job.salary_max) : null,
    }));

    console.log('✅ Retornando', jobs.length, 'jobs para a empresa');
    res.json({ jobs });

  } catch (error) {
    console.error('❌ Erro ao buscar vagas da empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// (rota /:id movida para o final do arquivo para não capturar rotas específicas como /stats)

// POST /api/jobs - Criar nova vaga
router.post('/', [
  authenticateToken,
  requireCompany,
  checkSubscriptionPlan('free'),
  validateCompanyVerification,
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('description').notEmpty().withMessage('Descrição é obrigatória'),
  body('requirements').optional().isString(),
  body('benefits').optional().isString(),
  body('salary_min').optional().isFloat({ min: 0 }),
  body('salary_max').optional().isFloat({ min: 0 }),
  body('location').optional().isString(),
  body('work_type').isIn(['presencial', 'remoto', 'hibrido']).withMessage('Tipo de trabalho inválido'),
  body('contract_type').isIn(['clt', 'pj', 'estagio', 'temporario', 'freelancer']).withMessage('Tipo de contrato inválido'),
  body('experience_level').isIn(['junior', 'pleno', 'senior', 'estagio']).withMessage('Nível de experiência inválido'),
  body('is_first_job').optional().isBoolean().withMessage('is_first_job deve ser um boolean'),
  body('category').optional().isString().withMessage('Categoria deve ser uma string'),
  body('area').notEmpty().withMessage('Área é obrigatória').custom(v => isValidArea(v)).withMessage('Área inválida'),
  body('subarea').optional().custom((v,{req}) => {
    if (!v) return true; // permitir vaga só com área
    if (!isValidArea(req.body.area)) throw new Error('Área inválida');
    if (!isValidSubarea(req.body.area, v)) throw new Error('Subárea inválida para a área informada');
    return true;
  })
], async (req, res) => {
  try {
  await ensureJobExtraColumns();
    console.log('🔍 POST /api/jobs - Recebendo dados para criar vaga:', {
      body: req.body,
      user: { id: req.user?.id, email: req.user?.email, type: req.user?.type }
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Erros de validação:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // ─────────────────────────────────────────────────────────
    // BLOCO 3: Validações de Plano
    // ─────────────────────────────────────────────────────────
    
    // Removido bloqueio de verificação - empresas podem criar vagas mesmo sem verificação
    // if (req.needsVerification) { ... }

    // Validar limite de vagas para plano free
    const jobLimitResult = await validateJobPostingLimit(req.user.id, req.user.type);
    if (jobLimitResult !== true) {
      return res.status(403).json({
        success: false,
        error: jobLimitResult.reason,
        current: jobLimitResult.current,
        limit: jobLimitResult.limit,
        upgradePlan: jobLimitResult.upgradePlan,
        upgradeUrl: '/pricing',
      });
    }

    const {
      title,
      description,
      requirements,
      benefits,
      salary_min,
      salary_max,
      location,
      work_type,
      contract_type,
      experience_level,
      is_first_job,
  category,
  area,
  subarea
    } = req.body;

    // Limites de vagas implementados via plano (free: 2/mês, pro: ilimitado)

    const query = `
      INSERT INTO jobs (
        company_id, title, description, requirements, benefits,
        salary_min, salary_max, location, work_type, contract_type, experience_level, is_first_job, category, area, subarea, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      req.user.id,
      title,
      description,
      requirements || null,
      benefits || null,
      salary_min || null,
      salary_max || null,
      location || null,
      work_type,
      contract_type,
      experience_level,
      is_first_job || false,
  category || null,
  area,
  subarea || null,
  true // is_active = true por padrão
    ];

    console.log('🔍 Executando query:', query);
    console.log('🔍 Com valores:', values);
    
    const result = await pool.query(query, values);
    
    console.log('✅ Vaga inserida no banco:', result.rows[0]);
    
    const job = {
      ...result.rows[0],
      salary_min: result.rows[0].salary_min ? parseFloat(result.rows[0].salary_min) : null,
      salary_max: result.rows[0].salary_max ? parseFloat(result.rows[0].salary_max) : null,
    };

    console.log('✅ Resposta final:', { job });
    res.status(201).json({ job });

  } catch (error) {
    console.error('❌ Erro ao criar vaga:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/jobs/:id - Atualizar vaga
router.put('/:id', [
  authenticateToken,
  requireCompany,
  param('id').isUUID().withMessage('ID inválido'),
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('description').notEmpty().withMessage('Descrição é obrigatória'),
  body('requirements').optional().isString(),
  body('benefits').optional().isString(),
  body('salary_min').optional().isFloat({ min: 0 }),
  body('salary_max').optional().isFloat({ min: 0 }),
  body('location').optional().isString(),
  body('work_type').isIn(['presencial', 'remoto', 'hibrido']).withMessage('Tipo de trabalho inválido'),
  body('contract_type').isIn(['clt', 'pj', 'estagio', 'temporario', 'freelancer']).withMessage('Tipo de contrato inválido'),
  body('experience_level').isIn(['junior', 'pleno', 'senior', 'estagio']).withMessage('Nível de experiência inválido'),
  body('is_first_job').optional().isBoolean().withMessage('is_first_job deve ser um boolean'),
  body('category').optional().isString().withMessage('Categoria deve ser uma string'),
  body('area').notEmpty().withMessage('Área é obrigatória').custom(v => isValidArea(v)).withMessage('Área inválida'),
  body('subarea').optional().custom((v,{req}) => {
    if (!v) return true;
    if (!isValidArea(req.body.area)) throw new Error('Área inválida');
    if (!isValidSubarea(req.body.area, v)) throw new Error('Subárea inválida para a área informada');
    return true;
  })
], async (req, res) => {
  try {
  await ensureJobExtraColumns();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar se a vaga pertence à empresa
    const checkQuery = 'SELECT id FROM jobs WHERE id = $1 AND company_id = $2';
    const checkResult = await pool.query(checkQuery, [req.params.id, req.user.id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada ou não autorizada' });
    }

    const {
      title,
      description,
      requirements,
      benefits,
      salary_min,
      salary_max,
      location,
      work_type,
      contract_type,
      experience_level,
      is_first_job,
  category,
  area,
  subarea
    } = req.body;

    const query = `
      UPDATE jobs SET
        title = $1,
        description = $2,
        requirements = $3,
        benefits = $4,
        salary_min = $5,
        salary_max = $6,
        location = $7,
        work_type = $8,
        contract_type = $9,
        experience_level = $10,
        is_first_job = $11,
        category = $12,
        area = $13,
        subarea = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 AND company_id = $16
      RETURNING *
    `;

    const values = [
      title,
      description,
      requirements || null,
      benefits || null,
      salary_min || null,
      salary_max || null,
      location || null,
      work_type,
      contract_type,
      experience_level,
      is_first_job || false,
  category || null,
  area,
  subarea || null,
  req.params.id,
  req.user.id
    ];

    const result = await pool.query(query, values);
    const job = {
      ...result.rows[0],
      salary_min: result.rows[0].salary_min ? parseFloat(result.rows[0].salary_min) : null,
      salary_max: result.rows[0].salary_max ? parseFloat(result.rows[0].salary_max) : null,
    };

    res.json({ job });

  } catch (error) {
    console.error('Erro ao atualizar vaga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/jobs/:id - Deletar vaga
router.delete('/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('ID inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Permissões:
    // - Se admin: pode deletar qualquer vaga da comunidade (is_community = TRUE)
    // - Se company: pode deletar suas próprias vagas (company_id = user.id)
    const jobRes = await pool.query('SELECT id, company_id, is_community FROM jobs WHERE id=$1', [req.params.id]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    const job = jobRes.rows[0];

    if (req.user.type === 'admin') {
      if (!job.is_community) {
        return res.status(403).json({ error: 'Admins só podem remover vagas da comunidade' });
      }
      // Preservar candidaturas: definir job_id = NULL antes de deletar
      const updatedApplications = await pool.query(
        'UPDATE applications SET job_id = NULL WHERE job_id = $1 RETURNING id',
        [req.params.id]
      );
      if (updatedApplications.rows.length > 0) {
        console.log(`📋 [DELETE JOB] ${updatedApplications.rows.length} candidatura(s) desvinculada(s) da vaga ${req.params.id}`);
      }
      await pool.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
      return res.json({ message: 'Vaga da comunidade deletada com sucesso' });
    }

    if (req.user.type === 'company') {
      if (job.company_id !== req.user.id) {
        return res.status(404).json({ error: 'Vaga não encontrada ou não autorizada' });
      }
      // Preservar candidaturas: definir job_id = NULL antes de deletar
      const updatedApplications = await pool.query(
        'UPDATE applications SET job_id = NULL WHERE job_id = $1 RETURNING id',
        [req.params.id]
      );
      if (updatedApplications.rows.length > 0) {
        console.log(`📋 [DELETE JOB] ${updatedApplications.rows.length} candidatura(s) desvinculada(s) da vaga ${req.params.id}`);
      }
      await pool.query('DELETE FROM jobs WHERE id=$1 AND company_id=$2', [req.params.id, req.user.id]);
      return res.json({ message: 'Vaga deletada com sucesso' });
    }

    return res.status(403).json({ error: 'Sem permissão para deletar esta vaga' });

  } catch (error) {
    console.error('Erro ao deletar vaga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/jobs/:id/toggle-status - Ativar/desativar vaga
router.patch('/:id/toggle-status', [
  authenticateToken,
  requireCompany,
  param('id').isUUID().withMessage('ID inválido'),
  body('is_active').isBoolean().withMessage('Status deve ser boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar se a vaga pertence à empresa
    const checkQuery = 'SELECT id FROM jobs WHERE id = $1 AND company_id = $2';
    const checkResult = await pool.query(checkQuery, [req.params.id, req.user.id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada ou não autorizada' });
    }

    const query = `
      UPDATE jobs SET
        is_active = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [req.body.is_active, req.params.id, req.user.id]);
    const job = {
      ...result.rows[0],
      salary_min: result.rows[0].salary_min ? parseFloat(result.rows[0].salary_min) : null,
      salary_max: result.rows[0].salary_max ? parseFloat(result.rows[0].salary_max) : null,
    };

    res.json({ job });

  } catch (error) {
    console.error('Erro ao alterar status da vaga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/jobs/companies/list - Listar empresas com vagas ativas
router.get('/companies/list', async (req, res) => {
  try {
    console.log('🏢 GET /api/jobs/companies/list - Request recebido');
    const query = `
      SELECT 
        u.id,
        u.company_name,
        u.bio as company_description,
        u.phone,
        COALESCE(COUNT(j.id), 0) as jobs_count
      FROM users u
      LEFT JOIN jobs j ON u.id = j.company_id AND j.is_active = TRUE
      WHERE u.type = 'company' 
        AND (u.disabled = FALSE OR u.disabled IS NULL)
      GROUP BY u.id, u.company_name, u.bio, u.phone
      ORDER BY jobs_count DESC, u.company_name ASC
    `;

    const result = await pool.query(query);

    res.json({ companies: result.rows });

  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/jobs/companies/:id/summary - Informações agregadas de uma empresa (para página da vaga)
router.get('/companies/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    // Garantir coluna de verificação (idempotente)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_sector VARCHAR(120)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`);

    const query = `
      SELECT 
        u.id,
        u.company_name,
        u.bio as company_description,
        u.phone,
        u.email as company_email,
        u.company_sector,
        u.company_size,
        COALESCE(u.is_verified, FALSE) as is_verified,
        COALESCE(jobs.active_jobs,0) as jobs_count
      FROM users u
      LEFT JOIN (
        SELECT company_id, COUNT(*) FILTER (WHERE is_active = TRUE) as active_jobs
        FROM jobs GROUP BY company_id
      ) jobs ON jobs.company_id = u.id
      WHERE u.id = $1 AND u.type='company' AND (u.disabled = FALSE OR u.disabled IS NULL)
      LIMIT 1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    res.json({ company: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar summary da empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== NOVOS ENDPOINTS PARA SISTEMA DE DESTAQUES =====

// Endpoint para escolas destacarem vagas
router.post('/highlights/school', authenticateToken, async (req, res) => {
  try {
    await ensureJobHighlights();
    
    if (req.user.type !== 'school') {
      return res.status(403).json({ error: 'Apenas escolas podem destacar vagas' });
    }

    const { job_id, class_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'ID da vaga é obrigatório' });
    }

    // Verificar se a vaga existe
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [job_id]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }

    // Verificar se a turma pertence à escola (se class_id fornecido)
    if (class_id) {
      const classCheck = await pool.query(
        'SELECT id FROM school_classes WHERE id = $1 AND school_id = $2',
        [class_id, req.user.id]
      );
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Turma não encontrada ou não pertence à escola' });
      }
    }

    // Inserir destaque (ou ignorar se já existe)
    await pool.query(
      `INSERT INTO job_highlights (job_id, school_id, class_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (job_id, school_id, class_id) DO NOTHING`,
      [job_id, req.user.id, class_id]
    );

    res.json({ success: true, message: 'Vaga destacada com sucesso' });

  } catch (error) {
    console.error('Erro ao destacar vaga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para empresas destacarem vagas em turmas específicas (plano premium)
router.post('/highlights/company', authenticateToken, async (req, res) => {
  try {
    await ensureCompanyHighlights();
    
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Apenas empresas podem usar este recurso' });
    }

    // TODO: Verificar se empresa tem plano premium
    // if (req.user.subscription_plan !== 'premium') {
    //   return res.status(403).json({ error: 'Recurso disponível apenas para plano premium' });
    // }

    const { job_id, school_id, class_id } = req.body;

    if (!job_id || !school_id || !class_id) {
      return res.status(400).json({ 
        error: 'ID da vaga, escola e turma são obrigatórios' 
      });
    }

    // Verificar se a vaga pertence à empresa
    const jobCheck = await pool.query(
      'SELECT id FROM jobs WHERE id = $1 AND company_id = $2',
      [job_id, req.user.id]
    );
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Vaga não encontrada ou não pertence à empresa' 
      });
    }

    // Verificar se escola e turma existem
    const classCheck = await pool.query(
      'SELECT sc.id FROM school_classes sc JOIN users u ON sc.school_id = u.id WHERE sc.id = $1 AND u.id = $2',
      [class_id, school_id]
    );
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Escola ou turma não encontrada' });
    }

    // Inserir destaque da empresa
    await pool.query(
      `INSERT INTO job_company_highlights (job_id, company_id, school_id, class_id) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (job_id, company_id, school_id, class_id) DO NOTHING`,
      [job_id, req.user.id, school_id, class_id]
    );

    res.json({ success: true, message: 'Vaga destacada na turma com sucesso' });

  } catch (error) {
    console.error('Erro ao destacar vaga da empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para remover destaque de vaga (escola)
router.delete('/highlights/school/:job_id', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'school') {
      return res.status(403).json({ error: 'Apenas escolas podem remover destaques' });
    }

    const { job_id } = req.params;
    const { class_id } = req.query;

    await pool.query(
      'DELETE FROM job_highlights WHERE job_id = $1 AND school_id = $2 AND ($3::uuid IS NULL OR class_id = $3)',
      [job_id, req.user.id, class_id || null]
    );

    res.json({ success: true, message: 'Destaque removido com sucesso' });

  } catch (error) {
    console.error('Erro ao remover destaque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para listar vagas destacadas por uma escola
router.get('/highlights/school', authenticateToken, async (req, res) => {
  try {
    await ensureJobHighlights();
    
    if (req.user.type !== 'school') {
      return res.status(403).json({ error: 'Apenas escolas podem ver seus destaques' });
    }

    const { class_id } = req.query;

    let query = `
      SELECT j.*, jh.class_id, jh.created_at as highlighted_at,
             u.company_name as company_name
      FROM job_highlights jh
      JOIN jobs j ON jh.job_id = j.id
      JOIN users u ON j.company_id = u.id
      WHERE jh.school_id = $1 AND j.is_active = TRUE
    `;
    const params = [req.user.id];

    if (class_id) {
      query += ' AND jh.class_id = $2';
      params.push(class_id);
    }

    query += ' ORDER BY jh.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      highlights: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar destaques da escola:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para listar vagas destacadas por empresas direcionadas à escola (por turma)
router.get('/highlights/company-for-school', authenticateToken, async (req, res) => {
  try {
    await ensureCompanyHighlights();
    if (req.user.type !== 'school') {
      return res.status(403).json({ error: 'Apenas escolas podem ver destaques de empresas' });
    }

    const { class_id } = req.query;
    let query = `
      SELECT j.*, jch.class_id, jch.created_at as highlighted_at,
        u.company_name as company_name
      FROM job_company_highlights jch
      JOIN jobs j ON jch.job_id = j.id
      JOIN users u ON j.company_id = u.id
      WHERE jch.school_id = $1 AND j.is_active = TRUE`;
    const params = [req.user.id];
    if (class_id) { query += ' AND jch.class_id = $2'; params.push(class_id); }
    query += ' ORDER BY jch.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, highlights: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Erro ao listar destaques de empresas para a escola:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/jobs/:id/recommendations (school recommends students for a job)
router.post('/:id/recommendations', authenticateToken, async (req, res) => {
  try {
    await ensureRecommendations();
    const jobId = req.params.id;
    // Validate job exists
    const jobQ = await pool.query('SELECT id, company_id FROM jobs WHERE id=$1 LIMIT 1', [jobId]);
    if (jobQ.rows.length === 0) return res.status(404).json({ success: false, message: 'Vaga não encontrada' });

    if (req.user.type !== 'school') return res.status(403).json({ success: false, message: 'Apenas escolas podem indicar alunos' });
    const { class_id, student_ids } = req.body || {};
    if (!Array.isArray(student_ids) || student_ids.length === 0) return res.status(400).json({ success: false, message: 'Selecione pelo menos um aluno' });

    // Validate class ownership if provided
    if (class_id) {
      const cls = await pool.query('SELECT id FROM school_classes WHERE id=$1 AND school_id=$2', [class_id, req.user.id]);
      if (cls.rows.length === 0) return res.status(400).json({ success: false, message: 'Turma inválida' });
    }

    // Validate student_ids belong to the school, collect their current class_id and is_featured
    const uniqIds = Array.from(new Set(student_ids));
    const studs = await pool.query(
      `SELECT s.id as student_row_id, s.user_id as student_id, s.class_id, COALESCE(s.is_featured,false) as is_featured
       FROM students s WHERE s.school_id=$1 AND s.user_id = ANY($2)`, [req.user.id, uniqIds]
    );
    if (studs.rows.length === 0) return res.status(400).json({ success: false, message: 'Nenhum aluno válido' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let inserted = 0;
      for (const st of studs.rows) {
        const clazz = class_id || st.class_id || null;
        await client.query(
          `INSERT INTO job_school_recommendations (job_id, school_id, class_id, student_id)
           VALUES ($1,$2,$3,$4) ON CONFLICT (job_id, school_id, student_id) DO NOTHING`,
          [jobId, req.user.id, clazz, st.student_id]
        );
        inserted++;
      }
      await client.query('COMMIT');
      res.json({ success: true, inserted });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Erro inserindo recomendações:', e);
      res.status(500).json({ success: false, message: 'Erro ao indicar alunos' });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Erro em POST /jobs/:id/recommendations', e);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// GET /api/jobs/:id/recommendations (company lists recommended students)
router.get('/:id/recommendations', authenticateToken, async (req, res) => {
  try {
    await ensureRecommendations();
    const jobId = req.params.id;
    const jobQ = await pool.query('SELECT id, company_id FROM jobs WHERE id=$1 LIMIT 1', [jobId]);
    if (jobQ.rows.length === 0) return res.status(404).json({ success: false, message: 'Vaga não encontrada' });
    const job = jobQ.rows[0];
    // Only company that owns the job or admins can see
    if (!(req.user.type === 'company' && req.user.id === job.company_id) && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const r = await pool.query(
      `SELECT r.id, r.created_at, r.class_id, sc.name as class_name,
              sch.id as school_id, sch.school_name, sch.profile_image as school_profile_image,
              u.id as user_id, u.name as student_name, u.email as student_email, u.phone as student_phone,
              u.profile_image as student_profile_image,
              COALESCE(s.is_featured,false) as is_featured,
              CASE WHEN p.id IS NOT NULL AND p.status = 'accepted' THEN true ELSE false END as is_partner
       FROM job_school_recommendations r
       JOIN users sch ON sch.id = r.school_id
       LEFT JOIN school_classes sc ON sc.id = r.class_id
       JOIN users u ON u.id = r.student_id
       LEFT JOIN students s ON s.user_id = u.id AND s.school_id = sch.id
       LEFT JOIN partnerships p ON p.school_id = sch.id AND p.company_id = $2
       WHERE r.job_id=$1
       ORDER BY sch.school_name ASC, s.is_featured DESC, u.name ASC`,
      [jobId, job.company_id]
    );
    res.json({ success: true, recommendations: r.rows });
  } catch (e) {
    console.error('Erro em GET /jobs/:id/recommendations', e);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Endpoint para buscar vagas por área (para sugestões inteligentes)
router.get('/by-area/:area', async (req, res) => {
  try {
    await ensureJobExtraColumns();
    
    const { area } = req.params;
    const { location, limit = 20 } = req.query;

    let query = `
      SELECT j.*, u.company_name as company_name, u.id as company_id
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      WHERE j.area = $1 AND j.is_active = TRUE
    `;
    const params = [area];

    if (location) {
      query += ' AND j.location ILIKE $' + (params.length + 1);
      params.push(`%${location}%`);
    }

    query += ' ORDER BY j.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      jobs: result.rows,
      total: result.rows.length,
      area,
      location: location || 'Todas as regiões'
    });

  } catch (error) {
    console.error('Erro ao buscar vagas por área:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para obter estatísticas de vagas
router.get('/stats', async (req, res) => {
  try {
    // Garantir colunas necessárias existem (migração preguiçosa)
    await ensureJobExtraColumns();
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as open_jobs,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as recent_jobs,
        COUNT(DISTINCT area) as total_areas,
        COUNT(DISTINCT company_id) as companies_with_jobs
      FROM jobs
    `);

    const areaStats = await pool.query(`
      SELECT area, COUNT(*) as count
      FROM jobs 
      WHERE is_active = TRUE AND area IS NOT NULL
      GROUP BY area
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      topAreas: areaStats.rows
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas (fallback retornado):', error?.message || error);
    // Fallback seguro para não quebrar o frontend
    res.json({
      success: true,
      degraded: true,
      stats: {
        total_jobs: 0,
        open_jobs: 0,
        recent_jobs: 0,
        total_areas: 0,
        companies_with_jobs: 0
      },
      topAreas: []
    });
  }
});

// ========== PARCERIAS (EMPRESAS) ==========
// IMPORTANTE: Estas rotas devem vir ANTES da rota /:id para evitar conflitos

// Solicitar parceria com escola
router.post('/partnerships/request/:schoolId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const { schoolId } = req.params;

    // Verificar se escola existe
    const schoolCheck = await pool.query(
      `SELECT id, name, type FROM users WHERE id=$1 AND type='school'`,
      [schoolId]
    );

    if (schoolCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escola não encontrada' });
    }

    // Verificar se já existe parceria
    const existing = await pool.query(
      `SELECT * FROM partnerships WHERE school_id=$1 AND company_id=$2`,
      [schoolId, companyId]
    );

    if (existing.rows.length > 0) {
      const partnership = existing.rows[0];
      
      // Se já está aceita
      if (partnership.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Parceria já existe' });
      }
      
      // Se está pendente e foi solicitada pela escola, aceitar automaticamente
      if (partnership.status === 'pending' && partnership.requested_by === 'school') {
        await pool.query(
          `UPDATE partnerships SET status='accepted', updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
          [partnership.id]
        );
        return res.json({ success: true, message: 'Parceria aceita com sucesso!', status: 'accepted' });
      }

      return res.status(400).json({ success: false, message: 'Solicitação já enviada' });
    }

    // Criar nova solicitação
    try {
      await pool.query(
        `INSERT INTO partnerships (school_id, company_id, status, requested_by) 
         VALUES ($1, $2, 'pending', 'company')`,
        [schoolId, companyId]
      );
    } catch (insertErr) {
      console.warn('Inserção com requested_by falhou, tentando fallback sem essa coluna:', insertErr.message);
      // Se a coluna requested_by não existir no schema (migração ausente), tentar fallback sem ela
      if (/requested_by|column .* does not exist|42703/.test(String(insertErr.message))) {
        try {
          await pool.query(
            `INSERT INTO partnerships (school_id, company_id, status) VALUES ($1, $2, 'pending')`,
            [schoolId, companyId]
          );
        } catch (fallbackErr) {
          console.error('Fallback de inserção também falhou:', fallbackErr);
          throw fallbackErr;
        }
      } else {
        throw insertErr;
      }
    }

    res.json({ success: true, message: 'Solicitação de parceria enviada!', status: 'pending' });
  } catch (error) {
    console.error('Erro ao solicitar parceria:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Listar parcerias da empresa
router.get('/partnerships', authenticateToken, requireCompany, async (req, res) => {
  try {
    console.log('[Partnerships Company] Requisição recebida');
    console.log('[Partnerships Company] User:', req.user);
    console.log('[Partnerships Company] Query params:', req.query);
    
    const companyId = req.user.id;
    const { status } = req.query; // pending, accepted
    
    console.log('[Partnerships Company] Company ID:', companyId, 'Status filter:', status);
    
    let query = `
      SELECT 
        p.*,
        u.id as school_id,
        u.name,
        u.email,
        u.school_name,
        u.school_city,
        u.school_state,
        u.profile_image AS school_profile_image
      FROM partnerships p
      JOIN users u ON u.id = p.school_id
      WHERE p.company_id = $1
    `;
    
    const params = [companyId];
    
    if (status) {
      query += ` AND p.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    console.log('[Partnerships Company] Found:', result.rows.length, 'partnerships');
    console.log('[Partnerships Company] Rows:', result.rows);
    
    res.json({ success: true, partnerships: result.rows });
  } catch (error) {
    console.error('Erro ao listar parcerias:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Aceitar solicitação de parceria
router.post('/partnerships/accept/:partnershipId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const { partnershipId } = req.params;

    const result = await pool.query(
      `UPDATE partnerships 
       SET status='accepted', updated_at=CURRENT_TIMESTAMP 
       WHERE id=$1 AND company_id=$2 AND status='pending'
       RETURNING *`,
      [partnershipId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
    }

    res.json({ success: true, message: 'Parceria aceita com sucesso!' });
  } catch (error) {
    console.error('Erro ao aceitar parceria:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Rejeitar/cancelar parceria
router.delete('/partnerships/:partnershipId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const { partnershipId } = req.params;

    const result = await pool.query(
      `DELETE FROM partnerships WHERE id=$1 AND company_id=$2 RETURNING *`,
      [partnershipId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parceria não encontrada' });
    }

    res.json({ success: true, message: 'Parceria removida com sucesso!' });
  } catch (error) {
    console.error('Erro ao remover parceria:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Verificar status de parceria com uma escola específica
router.get('/partnerships/status/:schoolId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const { schoolId } = req.params;

    const result = await pool.query(
      `SELECT * FROM partnerships WHERE school_id=$1 AND company_id=$2`,
      [schoolId, companyId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, status: 'none', partnership: null });
    }

    res.json({ success: true, status: result.rows[0].status, partnership: result.rows[0] });
  } catch (error) {
    console.error('Erro ao verificar parceria:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Verificar se empresa é parceira da escola do candidato logado
router.get('/partnerships/check-company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user?.id;
    
    // Se não é candidato ou não está logado, retornar false
    if (!userId || req.user?.type !== 'candidate') {
      return res.json({ success: true, isPartner: false });
    }
    
    // Buscar escola do candidato através da tabela students
    const userResult = await pool.query('SELECT school_id FROM students WHERE user_id = $1', [userId]);
    const schoolId = userResult.rows[0]?.school_id;
    
    if (!schoolId) {
      return res.json({ success: true, isPartner: false });
    }
    
    // Verificar se existe parceria aceita entre a escola do candidato e a empresa
    const partnershipResult = await pool.query(
      `SELECT id FROM partnerships WHERE school_id = $1 AND company_id = $2 AND status = 'accepted'`,
      [schoolId, companyId]
    );
    
    const isPartner = partnershipResult.rows.length > 0;
    
    res.json({ success: true, isPartner });
  } catch (error) {
    console.error('Erro ao verificar parceria da empresa:', error);
    res.status(500).json({ success: false, message: 'Erro interno', isPartner: false });
  }
});

// GET /api/jobs/:id - Obter uma vaga específica
// IMPORTANTE: Esta rota deve ficar ao FINAL para evitar conflito com rotas específicas como /partnerships
router.get('/:id', [
  param('id').isUUID().withMessage('ID inválido')
], optionalAuth, async (req, res) => {
  try {
    await ensureJobViewsTable();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query = `
      SELECT 
        j.*,
        COALESCE(u.company_name, j.community_company_name) AS company_name,
        u.email as company_email,
        u.company_sector,
        u.company_size
      FROM jobs j
      LEFT JOIN users u ON j.company_id = u.id
      WHERE j.id = $1 AND j.is_active = TRUE
    `;

    const result = await pool.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }

    const job = {
      ...result.rows[0],
      salary_min: result.rows[0].salary_min ? parseFloat(result.rows[0].salary_min) : null,
      salary_max: result.rows[0].salary_max ? parseFloat(result.rows[0].salary_max) : null,
    };

    // Incrementar contador de visualizações: 1x por dia por candidato (ou por IP+UA se anônimo)
    // Importante: NÃO contar visualizações da própria empresa dona da vaga
    try {
      const jobId = req.params.id;
      const today = new Date(); today.setHours(0,0,0,0);
      const todayStr = today.toISOString().slice(0,10);

      const viewer = req.user;
      const isCompanyOwner =
        viewer?.type === 'company' &&
        viewer.id &&
        String(viewer.id) === String(job.company_id);

      if (viewer?.id && viewer?.type === 'candidate') {
        const r = await pool.query(
          'SELECT 1 FROM job_views WHERE job_id=$1 AND user_id=$2 AND viewed_on=$3 LIMIT 1',
          [jobId, viewer.id, todayStr]
        );
        if (r.rows.length === 0) {
          await pool.query(
            'INSERT INTO job_views (job_id, user_id, viewed_on) VALUES ($1,$2,$3)',
            [jobId, viewer.id, todayStr]
          );
          await pool.query('UPDATE jobs SET views_count = COALESCE(views_count,0) + 1 WHERE id = $1', [jobId]);
        }
      } else if (!isCompanyOwner) {
        // anônimo ou usuário que NÃO é a própria empresa dona da vaga
        // usa dedup curto para não inflar com reloads imediatos
        if (shouldCountView(jobId, req)) {
          await pool.query('UPDATE jobs SET views_count = COALESCE(views_count,0) + 1 WHERE id = $1', [jobId]);
        }
      }
    } catch (e) {
      console.warn('Falha ao registrar visualização:', e?.message || e);
    }

    res.json({ job });

  } catch (error) {
    console.error('Erro ao buscar vaga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cache em memória para job match (TTL de 1 hora) - evita chamadas repetidas à API de IA
const jobMatchCache = new Map();
const JOB_MATCH_CACHE_TTL = 60 * 60 * 1000; // 1 hora em ms

// Garante que a tabela de cache de match existe no banco
async function ensureJobMatchCacheTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_match_cache (
        job_id UUID NOT NULL,
        resume_id UUID NOT NULL,
        result JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (job_id, resume_id)
      )
    `);
  } catch (e) {
    console.warn('Aviso: não foi possível criar tabela job_match_cache:', e?.message);
  }
}
ensureJobMatchCacheTable();

const DB_MATCH_CACHE_TTL_DAYS = 7; // Resultado válido por 7 dias no banco

// POST /api/jobs/match - Calcular compatibilidade entre currículo e vaga
router.post('/match', authenticateToken, async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;
    const userId = req.user.id;

    if (!jobId || !resumeId) {
      return res.status(400).json({ error: 'jobId e resumeId são obrigatórios' });
    }

    // 1) Verifica cache em memória (rápido)
    const cacheKey = `${jobId}:${resumeId}`;
    const cached = jobMatchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < JOB_MATCH_CACHE_TTL) {
      console.log(`✅ Job Match servido do cache memória: ${cacheKey}`);
      return res.json({ success: true, jobId, resumeId, fromCache: true, ...cached.data });
    }

    // 2) Verifica cache no banco de dados (persiste entre dispositivos e restarts)
    try {
      const dbCached = await pool.query(
        `SELECT result, created_at FROM job_match_cache
         WHERE job_id = $1 AND resume_id = $2
           AND created_at > NOW() - INTERVAL '${DB_MATCH_CACHE_TTL_DAYS} days'`,
        [jobId, resumeId]
      );
      if (dbCached.rows.length > 0) {
        const dbResult = dbCached.rows[0].result;
        // Atualiza cache em memória também
        jobMatchCache.set(cacheKey, { timestamp: Date.now(), data: dbResult });
        console.log(`✅ Job Match servido do cache banco: ${cacheKey}`);
        return res.json({ success: true, jobId, resumeId, fromCache: true, ...dbResult });
      }
    } catch (e) {
      console.warn('Aviso: erro ao consultar job_match_cache no banco:', e?.message);
    }

    // Busca vaga
    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    const job = jobResult.rows[0];

    // Busca currículo (verifica que pertence ao usuário)
    const resumeResult = await pool.query(
      'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
      [resumeId, userId]
    );
    if (resumeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Currículo não encontrado' });
    }
    const resume = resumeResult.rows[0];

    // Monta texto da vaga
    const jobText = [
      `Título: ${job.title || ''}`,
      `Empresa: ${job.company_name || ''}`,
      `Área: ${job.area || ''} ${job.subarea ? '/ ' + job.subarea : ''}`,
      `Tipo: ${job.job_type || ''} | Nível: ${job.experience_level || ''}`,
      `Localização: ${job.location || ''}`,
      `Descrição: ${(job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`,
      job.requirements ? `Requisitos: ${(job.requirements || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}` : '',
    ].filter(Boolean).join('\n');

    // Formata texto do currículo
    let resumeData = resume;
    // Faz parse dos campos JSONB se vierem como string
    for (const field of ['personal_info', 'education', 'experience', 'courses', 'languages', 'skills', 'certifications']) {
      if (typeof resume[field] === 'string') {
        try { resumeData[field] = JSON.parse(resume[field]); } catch {}
      }
    }
    const resumeText = formatResumeForAnalysis(resumeData);

    console.log(`🔍 Calculando Job Match: vaga="${job.title}" resumeId=${resumeId}`);

    try {
      const matchResult = await calculateJobMatch(resumeText, jobText);

      // Salva no cache em memória
      jobMatchCache.set(cacheKey, { timestamp: Date.now(), data: matchResult });

      // Salva no banco de dados (persiste entre dispositivos)
      try {
        await pool.query(
          `INSERT INTO job_match_cache (job_id, resume_id, result, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (job_id, resume_id) DO UPDATE SET result = $3, created_at = NOW()`,
          [jobId, resumeId, JSON.stringify(matchResult)]
        );
      } catch (e) {
        console.warn('Aviso: erro ao salvar job_match_cache no banco:', e?.message);
      }

      res.json({
        success: true,
        jobId,
        resumeId,
        ...matchResult,
      });
    } catch (aiError) {
      const isQuotaError = aiError.message.includes('429') || aiError.message.includes('RESOURCE_EXHAUSTED');
      
      console.error(`❌ Erro na IA${isQuotaError ? ' (quota)' : ''}: ${aiError.message.substring(0, 100)}`);
      
      // Se for erro de quota e tiver cache antigo, usa o cache como fallback
      if (isQuotaError && cached) {
        console.log(`⚠️ Usando cache antigo como fallback (${Math.round((Date.now() - cached.timestamp) / 1000)}s ago)`);
        return res.json({ 
          success: true, 
          jobId, 
          resumeId, 
          fromCache: true,
          staleCache: true,
          ...cached.data 
        });
      }
      
      // Se for quota mas não tem cache, retorna score genérico
      if (isQuotaError) {
        console.log('⚠️ Quota atingida, retornando score genérico');
        return res.json({
          success: true,
          jobId,
          resumeId,
          matchScore: 50,
          jobDifficulty: 5,
          candidateLevel: 5,
          reasons: ['Análise indisponível temporariamente devido a alta demanda da IA'],
          gapAnalysis: ['Tente novamente em alguns minutos'],
          quotaExhausted: true,
        });
      }
      
      // Para outros erros, retorna 500
      res.status(500).json({ error: 'Erro ao calcular compatibilidade: ' + aiError.message });
    }

  } catch (error) {
    console.error('❌ Erro no cálculo de job match (setup):', error);
    res.status(500).json({ error: 'Erro ao processar requisição: ' + error.message });
  }
});

export default router;
