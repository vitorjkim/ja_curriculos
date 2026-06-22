import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Auto-migração leve para suportar campos de entrevista se a migração ainda não foi rodada manualmente
async function ensureInterviewSchema(){
  try {
    console.log('🔎 Verificando/ajustando schema de entrevista...');
    await pool.query(`ALTER TABLE applications 
      ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS interview_location TEXT,
      ADD COLUMN IF NOT EXISTS interview_link TEXT,
      ADD COLUMN IF NOT EXISTS interview_notes TEXT,
      ADD COLUMN IF NOT EXISTS interview_confirmed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_confirmed_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_rescheduled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_canceled_by_company BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_canceled_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_rejected_by_candidate BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_rejected_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_rejected_interview_date TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS decision_feedback TEXT,
      ADD COLUMN IF NOT EXISTS decision_by UUID NULL,
      ADD COLUMN IF NOT EXISTS decision_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    // Remover QUALQUER constraint de status antiga e recriar
    const cons = await pool.query(`SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='applications'::regclass AND contype='c'`);
    for (const row of cons.rows) {
      if (/status/i.test(row.def) && /CHECK/i.test(row.def)) {
        console.log('�️ Removendo constraint antiga:', row.conname, row.def);
        await pool.query(`ALTER TABLE applications DROP CONSTRAINT IF EXISTS ${row.conname}`);
      }
    }
    await pool.query(`ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN ('pending','reviewing','interested','interview','approved','rejected'))`);
    console.log('✅ Constraint de status (atualizada) garantida.');
    delete global._applicationsAllowedStatuses; // força recálculo
  } catch(e){
    console.warn('⚠️ Falha ensureInterviewSchema:', e.message);
  }
}

// GET /api/applications - Listar candidaturas do usuário logado (candidato) com suporte a campos de entrevista
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let queryExtended = true;
    let result;
    try {
      result = await pool.query(`
        SELECT 
          a.id,
          a.job_id,
          a.resume_id,
          a.cover_letter,
          a.status,
          a.interview_date,
          a.interview_mode,
          a.interview_location,
          a.interview_link,
          a.interview_notes,
          a.interview_confirmed,
          a.decision_feedback,
          to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
          a.final_approved,
          to_char(a.final_approved_at,'YYYY-MM-DD HH24:MI:SS') as final_approved_at,
          a.created_at as applied_at,
          j.title as job_title,
          COALESCE(c.name, c.company_name, 'Empresa não informada') as company_name,
          c.profile_image as company_logo,
          j.location,
          CASE 
            WHEN j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL THEN
              CONCAT('R$ ', j.salary_min, ' - R$ ', j.salary_max)
            WHEN j.salary_min IS NOT NULL THEN
              CONCAT('A partir de R$ ', j.salary_min)
            WHEN j.salary_max IS NOT NULL THEN
              CONCAT('Até R$ ', j.salary_max)
            ELSE 'Salário a combinar'
          END as salary_range,
          r.title as resume_title,
          r.template as resume_template,
          r.original_file_path as resume_file_path
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN users c ON j.company_id = c.id
        LEFT JOIN resumes r ON a.resume_id = r.id
        WHERE a.candidate_id = $1
        ORDER BY a.created_at DESC`, [userId]);
    } catch (e) {
      if (e.code === '42703') {
        queryExtended = false;
        console.warn('⚠️ Campos de entrevista ausentes (rota candidato). Usando SELECT básico.');
        result = await pool.query(`
          SELECT 
            a.id,
            a.job_id,
            a.resume_id,
            a.cover_letter,
            a.status,
            a.decision_feedback,
            to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
            a.final_approved,
            to_char(a.final_approved_at,'YYYY-MM-DD HH24:MI:SS') as final_approved_at,
            a.created_at as applied_at,
            j.title as job_title,
            COALESCE(c.name, c.company_name, 'Empresa não informada') as company_name,
            c.profile_image as company_logo,
            j.location,
            CASE 
              WHEN j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL THEN
                CONCAT('R$ ', j.salary_min, ' - R$ ', j.salary_max)
              WHEN j.salary_min IS NOT NULL THEN
                CONCAT('A partir de R$ ', j.salary_min)
              WHEN j.salary_max IS NOT NULL THEN
                CONCAT('Até R$ ', j.salary_max)
              ELSE 'Salário a combinar'
            END as salary_range,
            r.title as resume_title,
            r.template as resume_template,
            r.original_file_path as resume_file_path
          FROM applications a
          JOIN jobs j ON a.job_id = j.id
          LEFT JOIN users c ON j.company_id = c.id
          LEFT JOIN resumes r ON a.resume_id = r.id
          WHERE a.candidate_id = $1
          ORDER BY a.created_at DESC`, [userId]);
      } else throw e;
    }

    res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma','no-cache');
    res.set('Expires','0');
    res.json({ success: true, applications: result.rows, interviewFields: queryExtended });
  } catch (error) {
    console.error('Erro ao buscar candidaturas:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/applications/user/:userId - Listar candidaturas de um usuário (admin, owner ou escola autorizada)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;
    const requesterType = req.user.type;

    const isAdmin = req.user.type === 'admin' || req.user.is_admin;
    const isOwner = requesterId === userId;

    // Checar vínculo escola->aluno
    let isSchoolAuthorized = false;
    if (requesterType === 'school') {
      const schoolCheck = await pool.query(
        'SELECT 1 FROM students WHERE user_id = $1 AND school_id = $2 LIMIT 1',
        [userId, requesterId]
      );
      if (schoolCheck.rows.length > 0) isSchoolAuthorized = true;
    }

    // Checar se empresa possui ao menos uma candidatura desse candidato
    let isCompanyAuthorized = false;
    if (requesterType === 'company') {
      try {
        const companyCheck = await pool.query(
          `SELECT 1 
             FROM applications a 
             JOIN jobs j ON a.job_id = j.id 
            WHERE a.candidate_id = $1 AND j.company_id = $2 
            LIMIT 1`,
          [userId, requesterId]
        );
        if (companyCheck.rows.length > 0) isCompanyAuthorized = true;
      } catch (e) {
        console.error('Erro verificação empresa candidaturas:', e.message);
      }
    }

    if (!isAdmin && !isOwner && !isSchoolAuthorized && !isCompanyAuthorized) {
      return res.status(403).json({ error: 'Acesso negado', code: 'ACCESS_DENIED' });
    }

    const result = await pool.query(`
      SELECT 
        a.id,
        a.job_id,
        a.resume_id,
        a.cover_letter,
        a.status,
        a.created_at as applied_at,
        j.title as job_title,
        COALESCE(c.name, c.company_name, 'Empresa não informada') as company_name,
        j.location,
        r.title as resume_title
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN users c ON j.company_id = c.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE a.candidate_id = $1
      ORDER BY a.created_at DESC
    `, [userId]);

    res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error('Erro ao buscar candidaturas por usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/applications/company - Listar candidaturas para empresa logada
router.get('/company', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (req.user.type !== 'company') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas empresas podem acessar esta rota.',
        code: 'FORBIDDEN'
      });
    }

    // Garantir schema de entrevista atualizado antes de consultar
    await ensureInterviewSchema();

    // Verificar se colunas de entrevista existem (todas) antes de montar SELECT estendido
    let interviewColumnsAvailable = false;
    try {
      const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'applications' AND column_name IN (
        'interview_date','interview_mode','interview_location','interview_link','interview_confirmed','interview_notes',
        'interview_rescheduled','interview_canceled_by_company','interview_canceled_at','interview_rejected_by_candidate','interview_rejected_at','interview_cancel_reason'
      )`);
      const found = cols.rows.map(r=>r.column_name);
      interviewColumnsAvailable = ['interview_date','interview_mode','interview_location','interview_link','interview_confirmed','interview_notes','interview_rescheduled','interview_canceled_by_company','interview_canceled_at','interview_rejected_by_candidate','interview_rejected_at','interview_cancel_reason']
        .every(c => found.includes(c));
    } catch (e) {
      // Se der erro aqui, assumimos que não estão disponíveis
      interviewColumnsAvailable = false;
    }

    const baseSelect = `
        SELECT 
          a.id,
          a.job_id,
          a.candidate_id,
          a.resume_id,
          a.cover_letter,
          a.status,
          a.decision_feedback,
          to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
          a.created_at,
          j.title as job_title,
          j.location,
          u.name as candidate_name,
          u.email as candidate_email,
          u.phone as candidate_phone,
          u.profile_image as candidate_profile_image,
          r.title as resume_title,
          r.template as resume_template,
          r.original_file_path as resume_file_path
        FROM applications a
        JOIN jobs j ON a.job_id = j.id AND j.company_id = $1
        JOIN users u ON a.candidate_id = u.id
        LEFT JOIN resumes r ON a.resume_id = r.id
        ORDER BY a.created_at DESC`;

    const extendedSelect = `
        SELECT 
          a.id,
          a.job_id,
          a.candidate_id,
          a.resume_id,
          a.cover_letter,
          a.status,
          a.interview_date,
          a.interview_mode,
          a.interview_location,
          a.interview_link,
          a.interview_confirmed,
          a.interview_rescheduled,
          a.interview_canceled_by_company,
          a.interview_canceled_at,
          a.interview_rejected_by_candidate,
          a.interview_rejected_at,
          a.final_approved,
          a.final_approved_at,
          a.decision_feedback,
          to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
          a.created_at,
          j.title as job_title,
          j.location,
          u.name as candidate_name,
          u.email as candidate_email,
          u.phone as candidate_phone,
          u.profile_image as candidate_profile_image,
          r.title as resume_title,
          r.template as resume_template,
          r.original_file_path as resume_file_path
        FROM applications a
        JOIN jobs j ON a.job_id = j.id AND j.company_id = $1
        JOIN users u ON a.candidate_id = u.id
        LEFT JOIN resumes r ON a.resume_id = r.id
        ORDER BY a.created_at DESC`;

    let result;
    if (interviewColumnsAvailable) {
      result = await pool.query(extendedSelect, [userId]);
    } else {
      if (!global._warnedInterviewColumnsMissing) {
        console.warn('⚠️ Colunas de entrevista ausentes (migração não aplicada). Usando SELECT legado. Rode a migração migrate_add_application_statuses.js para habilitar recursos de entrevista.');
        global._warnedInterviewColumnsMissing = true;
      }
      result = await pool.query(baseSelect, [userId]);
    }

    // Evitar cache para garantir que empresa veja confirmações e reagendamentos imediatamente
    res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma','no-cache');
    res.set('Expires','0');
    res.json({
      success: true,
      applications: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar candidaturas da empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// GET /api/applications/job/:jobId - Listar candidaturas para uma vaga específica
router.get('/job/:jobId', authenticateToken, [
  param('jobId').isUUID().withMessage('ID da vaga deve ser um UUID válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { jobId } = req.params;
    const userId = req.user.id;

    // Verificar se a vaga pertence à empresa
    const jobCheck = await pool.query(
      'SELECT id FROM jobs WHERE id = $1 AND company_id = $2',
      [jobId, userId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Vaga não encontrada ou você não tem permissão para vê-la',
        code: 'NOT_FOUND'
      });
    }

    const result = await pool.query(`
      SELECT 
        a.id,
        a.candidate_id,
        a.resume_id,
        a.cover_letter,
        a.status,
        a.created_at as applied_at,
        u.name as candidate_name,
        u.email as candidate_email,
        u.phone as candidate_phone,
        u.profile_image as candidate_profile_image,
        COALESCE(s.is_featured, false) as is_featured,
        sch.name as school_name,
        sch.profile_image as school_profile_image,
        sc.name as class_name,
        r.title as resume_title,
        r.template as resume_template,
        r.original_file_path as resume_file_path
      FROM applications a
      JOIN users u ON a.candidate_id = u.id
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN users sch ON s.school_id = sch.id
      LEFT JOIN school_classes sc ON s.class_id = sc.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE a.job_id = $1
        AND a.status NOT IN ('approved','rejected')
        AND NOT EXISTS (
          SELECT 1 FROM company_interactions ci 
          WHERE ci.job_id = a.job_id AND ci.candidate_id = a.candidate_id
        )
      ORDER BY COALESCE(s.is_featured,false) DESC, a.created_at DESC
    `, [jobId]);

    // Contar o total de candidaturas (incluindo aprovados/rejeitados) para saber se já houve candidatos
    const totalCount = await pool.query(
      'SELECT COUNT(*) as total FROM applications WHERE job_id = $1',
      [jobId]
    );
    const totalApplications = parseInt(totalCount.rows[0].total, 10);

    // Contar candidatos processados (aprovados + rejeitados)
    const processedCount = await pool.query(
      `SELECT COUNT(*) as total FROM applications WHERE job_id = $1 AND status IN ('approved','rejected')`,
      [jobId]
    );
    const processedApplications = parseInt(processedCount.rows[0].total, 10);

    res.json({
      success: true,
      applications: result.rows,
      totalApplications,
      processedApplications
    });
  } catch (error) {
    console.error('Erro ao buscar candidaturas da vaga:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// GET /api/applications/check/:jobId - Verificar se o candidato já se candidatou a uma vaga
router.get('/check/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const candidateId = req.user.id;

    // Só candidatos podem verificar
    if (req.user.type !== 'candidate') {
      return res.json({ success: true, hasApplied: false });
    }

    const result = await pool.query(
      'SELECT id, status, created_at FROM applications WHERE job_id = $1 AND candidate_id = $2 LIMIT 1',
      [jobId, candidateId]
    );

    const hasApplied = result.rows.length > 0;
    const application = hasApplied ? result.rows[0] : null;

    res.json({
      success: true,
      hasApplied,
      application: application ? {
        id: application.id,
        status: application.status,
        appliedAt: application.created_at
      } : null
    });
  } catch (error) {
    console.error('Erro ao verificar candidatura:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/applications - Criar nova candidatura
router.post('/', authenticateToken, [
  body('job_id').isUUID().withMessage('ID da vaga deve ser um UUID válido'),
  body('resume_id').optional().isUUID().withMessage('ID do currículo deve ser um UUID válido'),
  body('cover_letter').optional().isString().isLength({ max: 1000 }).withMessage('Carta de apresentação muito longa (máx. 1000 caracteres)')
], async (req, res) => {
  try {
    console.log('🔍 POST /api/applications - Dados recebidos:', req.body);
    console.log('👤 Usuário candidato:', req.user.id, req.user.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Erros de validação:', errors.array());
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { job_id, resume_id, cover_letter } = req.body;
    const candidateId = req.user.id;

    if (req.user.type === 'company') {
      return res.status(403).json({
        error: 'Empresas não podem se candidatar às vagas',
        code: 'FORBIDDEN'
      });
    }

    console.log('🔍 Verificando se a vaga existe:', job_id);
    
    // Verificar se a vaga existe
    const jobCheck = await pool.query('SELECT id, company_id FROM jobs WHERE id = $1', [job_id]);
    if (jobCheck.rows.length === 0) {
      console.log('❌ Vaga não encontrada');
      return res.status(404).json({
        error: 'Vaga não encontrada',
        code: 'NOT_FOUND'
      });
    }

    const companyId = jobCheck.rows[0].company_id;
    // Obter plano da empresa dona da vaga
    const planResult = await pool.query('SELECT subscription_plan FROM users WHERE id = $1', [companyId]);
    const subscriptionPlan = planResult.rows[0]?.subscription_plan || 'free';
    const appLimits = { free: 10, pro: 200, premium: Infinity };
    const allowedApplications = appLimits[subscriptionPlan] ?? 10;

    if (allowedApplications !== Infinity) {
      const countResult = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE j.company_id = $1
          AND date_trunc('month', a.created_at) = date_trunc('month', NOW())
      `, [companyId]);
      const receivedThisMonth = countResult.rows[0].count;
      if (receivedThisMonth >= allowedApplications) {
        return res.status(403).json({
          error: 'Limite mensal de currículos recebidos atingido para o plano da empresa.',
          code: 'APPLICATIONS_LIMIT_REACHED',
          subscriptionPlan,
          allowedApplications
        });
      }
    }

    console.log('🔍 Verificando candidatura existente');
    
    // Verificar se já se candidatou a essa vaga
    const existingApplication = await pool.query(
      'SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2',
      [job_id, candidateId]
    );

    if (existingApplication.rows.length > 0) {
      console.log('⚠️ Candidatura já existe');
      return res.status(409).json({
        error: 'Você já se candidatou a esta vaga',
        code: 'ALREADY_APPLIED'
      });
    }

    // Verificar se o currículo existe e pertence ao usuário (se fornecido)
    if (resume_id) {
      console.log('🔍 Verificando currículo:', resume_id);
      const resumeCheck = await pool.query(
        'SELECT id FROM resumes WHERE id = $1 AND user_id = $2',
        [resume_id, candidateId]
      );

      if (resumeCheck.rows.length === 0) {
        console.log('❌ Currículo não encontrado');
        return res.status(404).json({
          error: 'Currículo não encontrado',
          code: 'NOT_FOUND'
        });
      }
    }

    console.log('✅ Criando candidatura');
    
    // Criar candidatura
    const result = await pool.query(`
      INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, job_id, candidate_id, resume_id, cover_letter, status, created_at
    `, [job_id, candidateId, resume_id || null, cover_letter || null]);

    console.log('✅ Candidatura criada:', result.rows[0].id);

    res.status(201).json({
      success: true,
      application: result.rows[0],
      message: 'Candidatura enviada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar candidatura:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// PUT /api/applications/:id/status - Atualizar status da candidatura (apenas empresa)
router.put('/:id/status', authenticateToken, [
  param('id').isUUID().withMessage('ID da candidatura inválido'),
  body('status').isIn(['pending', 'reviewing', 'interested', 'interview', 'approved', 'rejected']).withMessage('Status inválido'),
  body('interview_date').optional().isISO8601().withMessage('Data de entrevista inválida'),
  body('interview_mode').optional().isIn(['online','presencial','hibrido']).withMessage('Modo de entrevista inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { id } = req.params;
    let { status, interview_date, interview_date_local, interview_mode, interview_location, interview_link, interview_notes, interview_confirmed } = req.body;
    // Se receber interview_date_local preferir armazenar como TIMESTAMP "na forma que veio" sem converter para UTC
    if (!interview_date && interview_date_local) {
      // Garantir formato 'YYYY-MM-DDTHH:MM:SS' ou 'YYYY-MM-DDTHH:MM'
      const norm = interview_date_local.length === 16 ? interview_date_local + ':00' : interview_date_local;
      // Remover eventual sufixo de timezone para manter literal
      const sanitized = norm.replace(/Z|[+-]\d\d:?\d\d$/,'');
      // Postgres TIMESTAMP sem timezone aceita 'YYYY-MM-DD HH:MM:SS'
      interview_date = sanitized.replace('T',' ');
    }
    const userId = req.user.id;

    if (req.user.type !== 'company') {
      return res.status(403).json({
        error: 'Apenas empresas podem alterar status de candidaturas',
        code: 'FORBIDDEN'
      });
    }

    // Verificar se a candidatura existe e a vaga pertence à empresa
    const applicationCheck = await pool.query(`
      SELECT a.id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1 AND j.company_id = $2
    `, [id, userId]);

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Candidatura não encontrada ou você não tem permissão para alterá-la',
        code: 'NOT_FOUND'
      });
    }

    // Sempre garantir schema antes de checar status/colunas
    await ensureInterviewSchema();

    // Detectar dinamicamente quais statuses a constraint atual permite (cache simples em memória por execução)
    if (!global._applicationsAllowedStatuses) {
      try {
        const cons = await pool.query(`SELECT pg_get_constraintdef(oid) AS def
          FROM pg_constraint WHERE conrelid='applications'::regclass AND conname ILIKE '%status%check%' LIMIT 1`);
        if (cons.rows[0]?.def) {
          const def = cons.rows[0].def;
          let statuses = [];
            // 1) Forma IN ('a','b',...)
          const matchIn = def.match(/IN \(([^)]+)\)/i);
          if (matchIn) {
            statuses = matchIn[1].split(',').map(s=>s.replace(/['\s]/g,'').replace(/::.*$/,'')).filter(Boolean);
          } else {
            // 2) Forma = ANY ((ARRAY['a','b',...])::text[])
            const matchArray = def.match(/ARRAY\[([^\]]+)\]/i);
            if (matchArray) {
              statuses = matchArray[1].split(',').map(s=>s.replace(/['\s]/g,'').replace(/::.*$/,'')).filter(Boolean);
            }
          }
          if (statuses.length) {
            global._applicationsAllowedStatuses = statuses;
          }
        }
      } catch (e) { /* ignore */ }
    }
    if (!Array.isArray(global._applicationsAllowedStatuses) || global._applicationsAllowedStatuses.length === 0) {
      global._applicationsAllowedStatuses = ['pending','approved','rejected','reviewing']; // suposição minimal antiga
    }
    // Garante sempre union com novos - evita mapping incorreto
    const union = new Set([...global._applicationsAllowedStatuses, 'interview','interested']);
    global._applicationsAllowedStatuses = Array.from(union);
    console.log('🧪 Allowed statuses detectados:', global._applicationsAllowedStatuses);

    let desiredStatus = status;
    if (!global._applicationsAllowedStatuses.includes(desiredStatus)) {
      return res.status(400).json({
        error: `Status '${desiredStatus}' não suportado (constraint antiga).`,
        allowed: global._applicationsAllowedStatuses,
        code: 'STATUS_NOT_ALLOWED'
      });
    }

    // (Já executado ensureInterviewSchema acima)

    // Atualizar status
    // Buscar estado atual para detectar reagendamento após confirmação
    let currentRow = null;
    try {
      const prevQ = await pool.query('SELECT interview_date, interview_confirmed FROM applications WHERE id=$1', [id]);
      currentRow = prevQ.rows[0] || null;
    } catch {}

    let result;
    try {
      // Tentativa completa com campos de entrevista
      const safe = v => (v === undefined ? null : v);
      const pStatus = safe(desiredStatus);
      // Usar string literal para timestamp sem timezone (sem conversão para UTC)
      let pDateStr = null;
      if (interview_date) {
        let s = String(interview_date).trim();
        s = s.replace('T',' ').replace(/Z|[+-]\d\d:?\d\d$/,'');
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) s += ':00';
        pDateStr = s;
      }
      const pMode = safe(interview_mode);
      const pLoc = safe(interview_location);
      const pLink = safe(interview_link);
      const pNotes = safe(interview_notes);
      const pConfirmed = safe(interview_confirmed);
      console.log('🛠️ Atualizando candidatura (status PUT) ->', { id, desiredStatus: pStatus, interview_date_iso: pDateStr, interview_mode: pMode, interview_location: pLoc, interview_link: pLink, interview_notes: pNotes, interview_confirmed: pConfirmed });
      result = await pool.query(`
        UPDATE applications
        SET
          status = $1::varchar,
          interview_rescheduled = CASE
            WHEN $2::timestamp IS NOT NULL
                 AND interview_date IS NOT NULL
                 AND interview_date IS DISTINCT FROM $2::timestamp THEN TRUE
            ELSE interview_rescheduled
          END,
          interview_confirmed = CASE
            WHEN $2::timestamp IS NOT NULL
                 AND interview_date IS NOT NULL
                 AND interview_date IS DISTINCT FROM $2::timestamp THEN FALSE
            ELSE COALESCE($7, interview_confirmed)
          END,
          -- Ao agendar/alterar entrevista, limpar flags de cancelamento/recusa anteriores
          interview_canceled_by_company = CASE WHEN $1::varchar = 'interview'::varchar OR $2::timestamp IS NOT NULL THEN FALSE ELSE interview_canceled_by_company END,
          interview_canceled_at = CASE WHEN $1::varchar = 'interview'::varchar OR $2::timestamp IS NOT NULL THEN NULL ELSE interview_canceled_at END,
          interview_cancel_reason = CASE WHEN $1::varchar = 'interview'::varchar OR $2::timestamp IS NOT NULL THEN NULL ELSE interview_cancel_reason END,
          interview_rejected_by_candidate = CASE WHEN $1::varchar = 'interview'::varchar OR $2::timestamp IS NOT NULL THEN FALSE ELSE interview_rejected_by_candidate END,
          interview_rejected_at = CASE WHEN $1::varchar = 'interview'::varchar OR $2::timestamp IS NOT NULL THEN NULL ELSE interview_rejected_at END,
          interview_date = COALESCE($2::timestamp, interview_date),
          interview_mode = COALESCE($3, interview_mode),
          interview_location = COALESCE(NULLIF($4,''), interview_location),
          interview_link = COALESCE(NULLIF($5,''), interview_link),
          interview_notes = COALESCE(NULLIF($6,''), interview_notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, status,
          to_char(interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
          interview_mode, interview_location, interview_link, interview_notes, interview_confirmed, interview_rescheduled,
          interview_canceled_by_company, interview_canceled_at, interview_cancel_reason, interview_rejected_by_candidate, interview_rejected_at, updated_at
      `, [pStatus, pDateStr, pMode, pLoc, pLink, pNotes, pConfirmed, id]);
      console.log('✅ Resultado UPDATE candidatura:', result.rows[0]);
    } catch (err) {
      if (err.code === '42703') { // coluna inexistente mesmo após tentativa
        console.warn('⚠️ 42703 (coluna ausente) após tentativa principal. Aplicando fallback progressivo.', err.message);
        // Tentar fallback incluindo interview_date isoladamente se enviado
        if (interview_date) {
          try {
            result = await pool.query(`
              UPDATE applications
              SET status = $1,
                  interview_date = COALESCE(($2)::timestamp, interview_date),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $3
              RETURNING id, status, to_char(interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date, updated_at
            `, [desiredStatus, pDateStr || null, id]);
          } catch (e2) {
            console.warn('⚠️ Fallback secundário falhou, usando mínimo:', e2.message);
            result = await pool.query(`
              UPDATE applications
              SET status = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
              RETURNING id, status, updated_at
            `, [desiredStatus, id]);
          }

          // --- DEBUG ROUTE (temporário) para inspecionar schema/constraints ---
          router.get('/schema-debug', authenticateToken, async (req,res)=>{
            if(!['admin','company','school'].includes(req.user.type)) return res.status(403).json({ error:'forbidden' });
            try {
              const cols = await pool.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='applications' ORDER BY ordinal_position`);
              const cons = await pool.query(`SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='applications'::regclass`);
              res.json({ success:true, columns: cols.rows, constraints: cons.rows, allowedStatusesCache: global._applicationsAllowedStatuses || null });
            } catch(e){
              res.status(500).json({ error:e.message });
            }
          });
        } else {
          result = await pool.query(`
            UPDATE applications
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, status, updated_at
          `, [desiredStatus, id]);
        }
      } else if (err.code === '23514') { // CHECK constraint: status não permitido ainda
        console.warn('⚠️ Constraint de status bloqueou valor', status, '- aplicando fallback');
        // Fallback: mapear statuses novos para equivalentes antigos se possível
        let fallbackStatus = desiredStatus;
        if (['interview','interested'].includes(status)) {
          fallbackStatus = 'approved';
        }
        result = await pool.query(`
          UPDATE applications
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, status, updated_at
        `, [fallbackStatus, id]);
      } else {
        throw err;
      }
    }

    // Anexar job_title para facilitar atualização do frontend
    let jobTitle = null;
    try {
      const jt = await pool.query('SELECT j.title FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1',[id]);
      jobTitle = jt.rows[0]?.title || null;
    } catch {}
    res.json({
      success: true,
      application: { ...result.rows[0], job_title: jobTitle },
      message: 'Status / entrevista atualizados com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar status da candidatura:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// DELETE /api/applications/:id - Cancelar candidatura (apenas candidato)
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('ID da candidatura inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se a candidatura existe e pertence ao usuário
    const applicationCheck = await pool.query(
      'SELECT id FROM applications WHERE id = $1 AND candidate_id = $2',
      [id, userId]
    );

    if (applicationCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Candidatura não encontrada ou você não tem permissão para cancelá-la',
        code: 'NOT_FOUND'
      });
    }

    // Remover candidatura
    await pool.query('DELETE FROM applications WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Candidatura cancelada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao cancelar candidatura:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;

// POST /api/applications/:id/decision - Empresa define decisão final (aprovado/reprovado) com feedback para o candidato
router.post('/:id/decision', authenticateToken, [
  param('id').custom(v => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const intRegex = /^\d+$/;
    if (uuidRegex.test(v) || intRegex.test(v)) return true;
    throw new Error('ID inválido');
  }),
  body('status').isIn(['approved','rejected']).withMessage('Status deve ser approved ou rejected'),
  body('feedback').optional().isString().isLength({ max: 2000 }).withMessage('Feedback muito longo (máx. 2000 caracteres)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Dados inválidos', details: errors.array(), code: 'VALIDATION_ERROR' });
    }
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Apenas empresas podem definir decisão.', code: 'FORBIDDEN' });
    await ensureInterviewSchema();
    const { id } = req.params;
    const { status, feedback } = req.body;
    // validar posse da vaga
    const check = await pool.query(`SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1 AND j.company_id=$2`, [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Candidatura não encontrada', code: 'NOT_FOUND' });

    // Montar atualização conforme decisão
    let upd;
    if (status === 'approved') {
      upd = await pool.query(`
        UPDATE applications SET
          status = 'approved',
          final_approved = TRUE,
          final_approved_at = NOW(),
          decision_feedback = COALESCE($2, decision_feedback),
          decision_by = $3,
          decision_at = NOW(),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, job_id, status, final_approved, to_char(final_approved_at,'YYYY-MM-DD HH24:MI:SS') as final_approved_at,
          decision_feedback, to_char(decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at, updated_at
      `, [id, feedback || null, req.user.id]);
    } else {
      // rejected: limpar flags de entrevista ativas
      upd = await pool.query(`
        UPDATE applications SET
          status = 'rejected',
          final_approved = FALSE,
          decision_feedback = COALESCE($2, decision_feedback),
          decision_by = $3,
          decision_at = NOW(),
          -- limpar campos de entrevista ativos
          interview_confirmed = FALSE,
          interview_rescheduled = FALSE,
          interview_canceled_by_company = FALSE,
          interview_canceled_at = NULL,
          interview_cancel_reason = NULL,
          interview_rejected_by_candidate = FALSE,
          interview_rejected_at = NULL,
          interview_date = NULL,
          interview_mode = NULL,
          interview_location = NULL,
          interview_link = NULL,
          interview_notes = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, job_id, status, final_approved, decision_feedback, to_char(decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at, updated_at
      `, [id, feedback || null, req.user.id]);
    }

    // Anexar job_title
    let jobTitle = null;
    try {
      const jt = await pool.query('SELECT j.title FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1', [id]);
      jobTitle = jt.rows[0]?.title || null;
    } catch {}

    return res.json({ success: true, application: { ...upd.rows[0], job_title: jobTitle }, message: 'Decisão registrada com sucesso.' });
  } catch (e) {
    console.error('Erro decisão da candidatura:', e.message);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// Endpoint para candidato confirmar presença na entrevista
router.post('/:id/confirm-interview', authenticateToken, [
  param('id').custom(v => {
    // aceitar UUID ou número (serial)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const intRegex = /^\d+$/;
    if (uuidRegex.test(v) || intRegex.test(v)) return true;
    throw new Error('ID inválido');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
    const { id } = req.params;
    console.log('🔔 Requisição confirmação entrevista', { applicationId: id, user: req.user?.id });
    if (req.user.type !== 'candidate') return res.status(403).json({ error: 'Apenas candidatos podem confirmar.' });
  const check = await pool.query('SELECT candidate_id,status,interview_date,job_id FROM applications WHERE id=$1', [id]);
    if (check.rows.length === 0 || check.rows[0].candidate_id !== req.user.id) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }
    const appRow = check.rows[0];
    if (!appRow.interview_date) {
      return res.status(400).json({ error: 'Nenhuma entrevista agendada para confirmar.' });
    }
    // Idempotente: se já confirmado, retornar direto
    try {
      const already = await pool.query(`SELECT a.interview_confirmed, a.interview_confirmed_at, a.interview_rescheduled, a.interview_mode, a.interview_location, a.interview_link, a.interview_notes, a.status, j.title as job_title
        FROM applications a LEFT JOIN jobs j ON j.id = a.job_id WHERE a.id=$1`, [id]);
      if (already.rows[0]?.interview_confirmed) {
        const interviewDate = appRow.interview_date;
        const now = new Date();
        const statusComputed = new Date(interviewDate) < now ? 'expired' : 'confirmed';
        return res.json({ success:true, application: { id, status: already.rows[0].status, job_id: check.rows[0].job_id, job_title: already.rows[0].job_title, interview_date: interviewDate, interview_confirmed: true, interview_confirmed_at: already.rows[0].interview_confirmed_at, interview_rescheduled: already.rows[0].interview_rescheduled, interview_mode: already.rows[0].interview_mode, interview_location: already.rows[0].interview_location, interview_link: already.rows[0].interview_link, interview_notes: already.rows[0].interview_notes, confirmation_status: statusComputed, can_confirm: false } });
      }
    } catch {}
    // Optional: evitar confirmar entrevistas já passadas
    try {
      const updated = await pool.query(`UPDATE applications 
        SET interview_confirmed = TRUE,
            interview_confirmed_at = CURRENT_TIMESTAMP,
            interview_rescheduled = FALSE,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id=$1 
        RETURNING id, job_id, status, to_char(interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date, interview_mode, interview_location, interview_link, interview_notes, interview_confirmed, interview_confirmed_at, interview_rescheduled, updated_at`, [id]);
      console.log('✅ Entrevista confirmada', updated.rows[0]);
      // anexar título da vaga (se existir)
      let jobTitle = null;
      try {
        const jt = await pool.query('SELECT title FROM jobs WHERE id=$1',[updated.rows[0].job_id]);
        jobTitle = jt.rows[0]?.title || null;
      } catch {}
      // Notificação para empresa (melhorar depois: inserir mensagem em chat ou tabela dedicada)
      try {
        await pool.query(`INSERT INTO candidate_messages (candidate_id, type, title, body, created_at)
          VALUES ($1, 'interview_confirmed', 'Entrevista confirmada', 'Candidato confirmou presença na entrevista.', NOW())` , [req.user.id]);
      } catch (notifyErr) {
        // silenciar se tabela não existir
        if (notifyErr.code !== '42P01') console.warn('⚠️ Falha ao registrar notificação de confirmação:', notifyErr.message);
      }
  const interviewDate = updated.rows[0].interview_date;
  const now = new Date();
  const parseLit = (s) => {
    if(!s) return null;
    const m = String(s).replace('T',' ').match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if(!m) return null;
    return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]||0));
  };
  const statusComputed = (parseLit(interviewDate) || now) < now ? 'expired' : 'confirmed';
  return res.json({ success:true, application: { ...updated.rows[0], job_title: jobTitle, confirmation_status: statusComputed, can_confirm: false } });
    } catch (e) {
      if (e.code === '42703') {
        // Colunas ainda não existem; retornar básico
        const basic = await pool.query('UPDATE applications SET interview_confirmed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id=$1 RETURNING id, job_id, status, updated_at', [id]);
        console.log('✅ Entrevista confirmada (fallback sem colunas)', basic.rows[0]);
        let jobTitle = null;
        try { const jt = await pool.query('SELECT title FROM jobs WHERE id=$1',[basic.rows[0].job_id]); jobTitle = jt.rows[0]?.title || null; } catch {}
  const interviewDate = appRow.interview_date;
  const now = new Date();
  const m = String(interviewDate||'').replace('T',' ').match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
  const lit = m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]||0)) : null;
  const statusComputed = (lit || now) < now ? 'expired' : 'confirmed';
        return res.json({ success:true, application: { ...basic.rows[0], job_title: jobTitle, interview_confirmed: true, interview_date: interviewDate, confirmation_status: statusComputed, can_confirm: false } });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro confirmação entrevista:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/applications/:id/reject-interview - Candidato rejeita entrevista
router.post('/:id/reject-interview', authenticateToken, [
  param('id').custom(v => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const intRegex = /^\d+$/;
    if (uuidRegex.test(v) || intRegex.test(v)) return true;
    throw new Error('ID inválido');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
    if (req.user.type !== 'candidate') return res.status(403).json({ error: 'Apenas candidatos.' });
    const { id } = req.params;
    await ensureInterviewSchema();
    const check = await pool.query('SELECT id, candidate_id, interview_date, interview_canceled_by_company FROM applications WHERE id=$1', [id]);
    if (check.rows.length === 0 || check.rows[0].candidate_id !== req.user.id)
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    if (!check.rows[0].interview_date)
      return res.status(400).json({ error: 'Nenhuma entrevista agendada para rejeitar.' });
    if (check.rows[0].interview_canceled_by_company)
      return res.status(400).json({ error: 'Entrevista já cancelada pela empresa.' });

    const upd = await pool.query(`UPDATE applications SET 
        interview_rejected_by_candidate = TRUE,
        interview_rejected_at = CURRENT_TIMESTAMP,
        last_rejected_interview_date = interview_date,
        interview_confirmed = FALSE,
        -- mover de volta para aprovados e limpar campos de entrevista
        status = 'approved',
        interview_date = NULL,
        interview_mode = NULL,
        interview_location = NULL,
        interview_link = NULL,
        interview_notes = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id=$1
      RETURNING id, job_id, status,
        to_char(interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
        interview_mode, interview_location, interview_link, interview_notes,
        interview_confirmed, interview_rejected_by_candidate, interview_rejected_at, last_rejected_interview_date, interview_canceled_by_company, interview_canceled_at, updated_at`, [id]);
    // opcional: notificar empresa (silencioso se tabela não existe)
    try {
      await pool.query(`INSERT INTO candidate_messages (candidate_id, type, title, body, created_at)
        VALUES ($1,'interview_rejected','Entrevista recusada','O candidato rejeitou a entrevista.',NOW())`, [req.user.id]);
    } catch(e){ if(e.code !== '42P01') console.warn('notify reject fail:', e.message); }

    return res.json({ success:true, application: upd.rows[0], message: 'Entrevista rejeitada.' });
  } catch (e) {
    console.error('Erro rejeitando entrevista:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/applications/:id/cancel-interview - Empresa cancela entrevista
router.post('/:id/cancel-interview', authenticateToken, [
  param('id').custom(v => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const intRegex = /^\d+$/;
    if (uuidRegex.test(v) || intRegex.test(v)) return true;
    throw new Error('ID inválido');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Apenas empresas.' });
    const { id } = req.params;
    const { reason } = req.body || {};
    await ensureInterviewSchema();
    const check = await pool.query(`SELECT a.id,a.job_id,a.interview_date,j.company_id
      FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1`, [id]);
    if (check.rows.length === 0 || check.rows[0].company_id !== req.user.id)
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    // Tornar idempotente: mesmo sem interview_date, aplicar cancelamento/limpeza e manter aprovado

    const upd = await pool.query(`UPDATE applications SET 
        interview_canceled_by_company = TRUE,
        interview_canceled_at = CURRENT_TIMESTAMP,
        interview_cancel_reason = COALESCE($2, interview_cancel_reason),
        interview_confirmed = FALSE,
        interview_rescheduled = FALSE,
    interview_rejected_by_candidate = FALSE,
    interview_rejected_at = NULL,
        -- mover de volta para aprovados e limpar campos de entrevista
        status = 'approved',
        interview_date = NULL,
        interview_mode = NULL,
        interview_location = NULL,
        interview_link = NULL,
        interview_notes = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id=$1
      RETURNING id, job_id, status,
        to_char(interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
        interview_mode, interview_location, interview_link, interview_notes,
        interview_confirmed, interview_canceled_by_company, interview_canceled_at, interview_cancel_reason, updated_at`, [id, reason || null]);
    return res.json({ success:true, application: upd.rows[0], message: 'Entrevista cancelada.' });
  } catch (e) {
    console.error('Erro cancelando entrevista:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/applications/:id/final-approve - Empresa aprova candidato após entrevista (etapa final)
router.post('/:id/final-approve', authenticateToken, [
  param('id').custom(v => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const intRegex = /^\d+$/;
    if (uuidRegex.test(v) || intRegex.test(v)) return true;
    throw new Error('ID inválido');
  })
], async (req, res) => {
  try {
    await ensureInterviewSchema();
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Apenas empresas.' });
    const { id } = req.params;
    // validar posse da vaga
    const check = await pool.query(`SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1 AND j.company_id=$2`,[id, req.user.id]);
    if (check.rows.length===0) return res.status(404).json({ error:'Candidatura não encontrada' });
    const upd = await pool.query(`
      UPDATE applications SET 
        status = 'approved',
        final_approved = TRUE,
        final_approved_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
      WHERE id=$1
      RETURNING id, job_id, status, final_approved, final_approved_at, updated_at
    `,[id]);
    return res.json({ success:true, application: upd.rows[0], message: 'Candidato aprovado!' });
  } catch (e) {
    console.error('Erro ao aprovar candidato:', e.message);
    res.status(500).json({ error:'Erro interno' });
  }
});

// GET pipeline consolidado por vaga (inclui entrevistas) - /api/applications/job/:jobId/pipeline
router.get('/job/:jobId/pipeline', authenticateToken, [ param('jobId').custom(v => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const intRegex = /^\d+$/;
  if (uuidRegex.test(v) || intRegex.test(v)) return true; throw new Error('jobId inválido');
}) ], async (req,res)=>{
  try {
    await ensureInterviewSchema();
    const { jobId } = req.params;
    if (req.user.type !== 'company') return res.status(403).json({ error: 'Apenas empresas.' });
    const check = await pool.query('SELECT id FROM jobs WHERE id=$1 AND company_id=$2',[jobId, req.user.id]);
    if (check.rows.length===0) return res.status(404).json({ error: 'Vaga não encontrada' });
    let rows;
    try {
      rows = (await pool.query(`SELECT a.id,a.job_id,a.candidate_id,a.status,
        to_char(a.interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
        a.interview_mode,a.interview_location,a.interview_link,a.interview_notes,a.interview_confirmed,a.interview_rescheduled,a.interview_confirmed_at,
        a.interview_canceled_by_company,a.interview_canceled_at,a.interview_rejected_by_candidate,a.interview_rejected_at,a.interview_cancel_reason,
        to_char(a.last_rejected_interview_date,'YYYY-MM-DD HH24:MI:SS') as last_rejected_interview_date,
        a.final_approved, to_char(a.final_approved_at,'YYYY-MM-DD HH24:MI:SS') as final_approved_at,
        a.decision_feedback, to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
        a.created_at,u.name as candidate_name,u.email as candidate_email,u.phone as candidate_phone,u.profile_image as candidate_avatar_url,
        sch.name as school_name, sch.school_name as school_display_name, sch.profile_image as school_avatar_url,
        COALESCE(st.is_featured, false) as is_featured,
        r.id as resume_id,r.title as resume_title,j.title as job_title 
        FROM applications a
        JOIN users u ON u.id=a.candidate_id
        LEFT JOIN students st ON st.user_id=a.candidate_id
        LEFT JOIN users sch ON sch.id=st.school_id
        LEFT JOIN resumes r ON r.id=a.resume_id
        LEFT JOIN jobs j ON j.id=a.job_id
        WHERE a.job_id=$1
        ORDER BY a.created_at DESC`,[jobId])).rows;
    } catch (e) {
      if (e.code==='42703') {
        console.warn('⚠️ Fallback pipeline completo, removendo colunas opcionais:', e.message);
        // Primeira tentativa de fallback: manter interview_date e interview_confirmed
        try {
          rows = (await pool.query(`SELECT a.id,a.job_id,a.candidate_id,a.status,
            to_char(a.interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
            a.interview_confirmed,a.interview_canceled_by_company,a.interview_rejected_by_candidate,
            to_char(a.last_rejected_interview_date,'YYYY-MM-DD HH24:MI:SS') as last_rejected_interview_date,
            a.final_approved, to_char(a.final_approved_at,'YYYY-MM-DD HH24:MI:SS') as final_approved_at,
            a.decision_feedback, to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
            a.created_at,u.name as candidate_name,u.email as candidate_email,u.phone as candidate_phone,u.profile_image as candidate_avatar_url,r.id as resume_id,r.title as resume_title,j.title as job_title 
            FROM applications a JOIN users u ON u.id=a.candidate_id LEFT JOIN resumes r ON r.id=a.resume_id LEFT JOIN jobs j ON j.id=a.job_id WHERE a.job_id=$1 ORDER BY a.created_at DESC`,[jobId])).rows;
        } catch (e2) {
          if (e2.code==='42703') {
            console.warn('⚠️ Fallback secundário pipeline (mínimo):', e2.message);
            rows = (await pool.query(`SELECT a.id,a.job_id,a.candidate_id,a.status,a.created_at,u.name as candidate_name,u.email as candidate_email,u.phone as candidate_phone,u.profile_image as candidate_avatar_url,r.id as resume_id,r.title as resume_title,j.title as job_title FROM applications a JOIN users u ON u.id=a.candidate_id LEFT JOIN resumes r ON r.id=a.resume_id LEFT JOIN jobs j ON j.id=a.job_id WHERE a.job_id=$1 ORDER BY a.created_at DESC`,[jobId])).rows;
          } else throw e2;
        }
      } else throw e;
    }
    res.set('Cache-Control','no-store');
    return res.json({ success:true, applications: rows });
  } catch (e) {
    console.error('Erro pipeline job:', e.message);
    res.status(500).json({ error:'Erro interno' });
  }
});

// GET entrevistas do candidato /api/applications/interviews
// Agora separa em dois grupos:
// - upcoming: Entrevistas Marcadas (futuras/em aberto)
// - history: Entrevistas Realizadas (histórico, incluindo canceladas/rejeitadas e que viraram contratação)
router.get('/interviews', authenticateToken, async (req,res)=>{
  try {
    await ensureInterviewSchema();
    if (req.user.type !== 'candidate') return res.status(403).json({ error: 'Apenas candidatos' });

    const candidateId = req.user.id;

    // Entrevistas futuras/em aberto (marcadas e ainda não concluídas ou canceladas)
    let upcoming = [];
    // Histórico de entrevistas já realizadas / concluídas (inclui canceladas, rejeitadas e as que viraram contratação)
    let history = [];

    try {
      const nowLiteral = 'NOW()';
      const baseSelect = `
        SELECT 
          a.id,
          a.job_id,
          a.status,
          to_char(a.interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
          a.interview_mode,
          a.interview_location,
          a.interview_link,
          a.interview_notes,
          a.interview_confirmed,
          a.interview_rescheduled,
          a.interview_confirmed_at,
          a.interview_canceled_by_company,
          a.interview_canceled_at,
          a.interview_rejected_by_candidate,
          a.interview_rejected_at,
          a.interview_cancel_reason,
          a.last_rejected_interview_date,
          a.final_approved,
          a.final_approved_at,
          a.updated_at,
          a.created_at,
          j.title as job_title,
          j.company_id
        FROM applications a 
        JOIN jobs j ON j.id=a.job_id
        WHERE a.candidate_id=$1
          AND a.interview_date IS NOT NULL
      `;

      // upcoming: entrevista futura e não cancelada/rejeitada
      const upcomingQuery = `${baseSelect}
        AND a.interview_date >= ${nowLiteral}
        AND COALESCE(a.interview_canceled_by_company, FALSE) = FALSE
        AND COALESCE(a.interview_rejected_by_candidate, FALSE) = FALSE
      ORDER BY a.interview_date ASC`;

      // history: entrevistas com data passada OU que foram canceladas/rejeitadas OU que resultaram em contratação
      const historyQuery = `${baseSelect}
        AND (
          a.interview_date < ${nowLiteral}
          OR COALESCE(a.interview_canceled_by_company, FALSE) = TRUE
          OR COALESCE(a.interview_rejected_by_candidate, FALSE) = TRUE
          OR COALESCE(a.final_approved, FALSE) = TRUE
        )
      ORDER BY COALESCE(a.interview_date, a.updated_at, a.created_at) DESC`;

      upcoming = (await pool.query(upcomingQuery, [candidateId])).rows;
      history = (await pool.query(historyQuery, [candidateId])).rows;
    } catch (e) {
      if (e.code==='42703') {
        console.warn('⚠️ Fallback entrevistas candidato (colunas opcionais ausentes):', e.message);
        // Fallback mínimo: usa apenas interview_date, status e created_at
        const fallback = (await pool.query(`
          SELECT 
            a.id,
            a.job_id,
            a.status,
            to_char(a.interview_date,'YYYY-MM-DD HH24:MI:SS') as interview_date,
            a.updated_at,
            a.created_at,
            j.title as job_title,
            j.company_id
          FROM applications a 
          JOIN jobs j ON j.id=a.job_id
          WHERE a.candidate_id=$1
            AND a.interview_date IS NOT NULL
          ORDER BY a.interview_date ASC`, [candidateId])).rows;

        const now = new Date();
        const parseLit = (s) => {
          if (!s) return null;
          const m = String(s).replace('T',' ').match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
          if (!m) return null;
          return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
        };

        fallback.forEach(row => {
          const d = parseLit(row.interview_date);
          if (d && d >= now) upcoming.push(row); else history.push(row);
        });
      } else throw e;
    }

    res.set('Cache-Control','no-store');
    return res.json({ success:true, upcoming, history });
  } catch (e) {
    console.error('Erro list interviews candidato:', e.message);
    res.status(500).json({ error: 'Erro interno'});
  }
});
