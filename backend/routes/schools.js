import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import multer from 'multer';
import { validate as validateUUID } from 'uuid';

// Configuração básica de upload para importação (CSV/XLSX)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const router = express.Router();
console.log('🔧 Carregando schools router...');

// Middleware para verificar se é escola
const requireSchool = (req, res, next) => {
  if (req.user.type !== 'school') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acesso negado. Apenas escolas podem acessar esta funcionalidade.' 
    });
  }
  next();
};

// ========== ROTAS DE CURSOS ==========

// Listar cursos da escola
router.get('/courses', authenticateToken, requireSchool, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, name, description, duration_months, level, area, is_active,
        created_at, updated_at
      FROM courses 
      WHERE school_id = $1 
      ORDER BY name
    `, [req.user.id]);

    res.json({
      success: true,
      courses: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Criar novo curso
router.post('/courses', authenticateToken, requireSchool, async (req, res) => {
  try {
    const { name, description, duration_months, level, area } = req.body;

    if (!name || !level) {
      return res.status(400).json({
        success: false,
        message: 'Nome e nível são obrigatórios'
      });
    }

    const result = await pool.query(`
      INSERT INTO courses (school_id, name, description, duration_months, level, area)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, name, description, duration_months, level, area]);

    res.status(201).json({
      success: true,
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar curso
router.put('/courses/:id', authenticateToken, requireSchool, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration_months, level, area, is_active } = req.body;

    const result = await pool.query(`
      UPDATE courses 
      SET name = $1, description = $2, duration_months = $3, level = $4, 
          area = $5, is_active = $6, updated_at = NOW()
      WHERE id = $7 AND school_id = $8
      RETURNING *
    `, [name, description, duration_months, level, area, is_active, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Curso não encontrado'
      });
    }

    res.json({
      success: true,
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ========== ROTAS DE ESTUDANTES ==========
console.log('🔧 Registrando rotas de estudantes (list/create/update/get/toggle/delete)');

// Listar estudantes da escola
router.get('/students', authenticateToken, requireSchool, async (req, res) => {
  try {
    const { course_id, status, class_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

  // Garantir coluna de destaque
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);

    let whereConditions = ['s.school_id = $1'];
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (course_id) {
      paramCount++;
      whereConditions.push(`s.course_id = $${paramCount}`);
      queryParams.push(course_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`s.status = $${paramCount}`);
      queryParams.push(status);
    }
    if (class_id) {
      paramCount++;
      whereConditions.push(`s.class_id = $${paramCount}`);
      queryParams.push(class_id);
    }

    const whereClause = whereConditions.join(' AND ');

  const result = await pool.query(`
      SELECT 
        s.id, s.user_id, s.student_registration, s.enrollment_date, s.graduation_date,
        s.current_semester, s.total_semesters, s.gpa, s.status, s.notes,
        s.emergency_contact_name, s.emergency_contact_phone, s.birth_date, s.gender,
        u.name, u.email, u.phone, u.cpf, u.profile_image,
        c.name as course_name, c.level as course_level,
    sc.name as class_name, s.class_id,
    s.is_featured,
        s.created_at, s.updated_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN school_classes sc ON s.class_id = sc.id
      WHERE ${whereClause}
      ORDER BY u.name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, limit, offset]);

    // Contar total
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM students s
      WHERE ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      students: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar estudantes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Resumo por aluno (escola toda) com agregados – precisa vir ANTES de '/students/:id' para não conflitar
router.get('/students/summary', authenticateToken, requireSchool, async (req,res)=>{
  try {
    // Garantir coluna de destaque
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    // Garantir colunas de applications usadas nos cálculos
    await pool.query(`
      ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS interview_canceled_by_company BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_rejected_by_candidate BOOLEAN DEFAULT FALSE
    `);
    const r = await pool.query(`
      SELECT 
        s.id as student_id,
        u.id as user_id,
        u.name, u.email,
        u.phone, u.cpf,
        u.profile_image,
        s.status, s.is_featured,
        s.birth_date, s.gender,
        c.name as course_name,
        sc.name as class_name,
        -- métricas agregadas
        (COUNT(rz.id) > 0) AS has_resume,
        COUNT(rz.id) AS resumes_count,
        COUNT(a.id) AS applications_count,
        -- Entrevista inferida por aprovado/rejeitado/final
        BOOL_OR(COALESCE(a.final_approved,false) OR a.status IN ('approved','rejected')) AS has_interview,
        -- Entrevista ativa (marcada e não cancelada/rejeitada e não final aprovada)
        BOOL_OR(
          a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
        ) AS has_active_interview,
        BOOL_OR(COALESCE(a.final_approved,false)) AS final_approved,
        -- Pré-aprovado também verdadeiro quando há aprovado final
        BOOL_OR(COALESCE(a.final_approved,false) OR a.status='approved') AS pre_approved,
        BOOL_OR(a.status='rejected') AS rejected
      FROM students s 
      JOIN users u ON s.user_id=u.id 
      LEFT JOIN courses c ON c.id=s.course_id
      LEFT JOIN school_classes sc ON sc.id=s.class_id
      LEFT JOIN resumes rz ON rz.user_id = s.user_id
      LEFT JOIN applications a ON a.candidate_id = s.user_id
      WHERE s.school_id=$1 
      GROUP BY s.id, u.id, u.name, u.email, u.phone, u.cpf, u.profile_image, s.status, s.is_featured, s.birth_date, s.gender, c.name, sc.name
      ORDER BY u.name
    `,[req.user.id]);
    res.json({ success:true, students:r.rows });
  } catch(e){ console.error('List school student summary error',e); res.status(500).json({ success:false, message:'Erro ao listar resumo de alunos'}); }
});

// ========== ESTATÍSTICAS POR TURMA ==========
router.get('/classes/featured/stats', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;

    // Estatísticas apenas dos alunos destacados
    const [rTotal, rWithoutResumes, rWithoutApps, rByStatus, rStudentsWithApps] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM students WHERE school_id=$1 AND is_featured=true`, [schoolId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM students s
        WHERE s.school_id=$1 AND s.is_featured=true
          AND NOT EXISTS (SELECT 1 FROM resumes r WHERE r.user_id=s.user_id)
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM students s
        WHERE s.school_id=$1 AND s.is_featured=true
          AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.candidate_id=s.user_id)
          AND NOT EXISTS (SELECT 1 FROM external_applications ea WHERE ea.student_id=s.user_id)
      `, [schoolId]),
      pool.query(`
        SELECT s.status, COUNT(*)::int AS count
        FROM students s
        WHERE s.school_id=$1 AND s.is_featured=true
        GROUP BY s.status
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS count FROM (
          SELECT s.user_id FROM students s JOIN applications a ON a.candidate_id=s.user_id WHERE s.school_id=$1 AND s.is_featured=true
          UNION
          SELECT s.user_id FROM students s JOIN external_applications ea ON ea.student_id=s.user_id WHERE s.school_id=$1 AND s.is_featured=true
        ) combined
      `, [schoolId])
    ]);

    const totalStudents = rTotal.rows[0]?.total || 0;
    const withoutResumes = rWithoutResumes.rows[0]?.count || 0;
    const withoutApps = rWithoutApps.rows[0]?.count || 0;
    const studentsByStatus = rByStatus.rows;
    const studentsWithApplications = rStudentsWithApps.rows[0]?.count || 0;

    // Empregabilidade dos alunos destacados
    await pool.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE`);
    const [rHired, rInterviews, rInterviewsDistinct, rApplications, rPreApproved, rRejected] = await Promise.all([
      pool.query(`
        SELECT (
          COALESCE((SELECT COUNT(DISTINCT a.candidate_id) FROM applications a JOIN students s ON s.user_id=a.candidate_id WHERE s.school_id=$1 AND s.is_featured=true AND COALESCE(a.final_approved,false)=true), 0)
          + COALESCE((SELECT COUNT(DISTINCT ea.student_id) FROM external_applications ea JOIN students s ON s.user_id=ea.student_id WHERE s.school_id=$1 AND s.is_featured=true AND LOWER(ea.status) IN ('hired','contratado','aprovado','accepted','approved')), 0)
        )::int AS count
      `,[schoolId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.is_featured=true
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
      `,[schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.is_featured=true
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
      `,[schoolId]),
      pool.query(`
        SELECT (COALESCE(internal.cnt,0) + COALESCE(external.cnt,0))::int AS count
        FROM
          (SELECT COUNT(*)::int AS cnt FROM applications a JOIN students s ON s.user_id=a.candidate_id WHERE s.school_id=$1 AND s.is_featured=true) internal,
          (SELECT COUNT(*)::int AS cnt FROM external_applications ea JOIN students s ON s.user_id=ea.student_id WHERE s.school_id=$1 AND s.is_featured=true) external
      `,[schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.is_featured=true AND a.status='approved' AND COALESCE(a.final_approved,false)=false
      `,[schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.is_featured=true AND a.status='rejected'
      `,[schoolId])
    ]);

    const hiredStudents = rHired.rows[0]?.count || 0;
    const interviews = rInterviews.rows[0]?.count || 0;
    const interviewsDistinctStudents = rInterviewsDistinct.rows[0]?.count || 0;
    const applications = rApplications.rows[0]?.count || 0;
    const preApprovedStudents = rPreApproved.rows[0]?.count || 0;
    const rejectedStudents = rRejected.rows[0]?.count || 0;

    const rates = {
      employed_pct_all_students: totalStudents>0 ? Math.round((hiredStudents/totalStudents)*1000)/10 : 0,
      // porcentagem de alunos que já tiveram qualquer entrevista (histórico completo)
      interviews_pct_students: totalStudents>0 ? Math.round((interviewsDistinctStudents/totalStudents)*1000)/10 : 0,
      applicants_pct: totalStudents>0 ? Math.round((studentsWithApplications/totalStudents)*1000)/10 : 0,
    };

    res.json({
      success:true,
      class: { id: 'featured', name: 'Alunos Destacados' },
      stats: {
        total_students: totalStudents,
        students_without_resumes: withoutResumes,
        students_without_applications: withoutApps,
        students_by_status: studentsByStatus
      },
      employability: {
        totals: { total_students: totalStudents, students_with_applications: studentsWithApplications },
        counts: { 
          hired_students: hiredStudents, 
          interviews, 
          interviews_distinct_students: interviewsDistinctStudents, 
          applications,
          pre_approved_students: preApprovedStudents,
          rejected_students: rejectedStudents
        },
        rates
      }
    });
  } catch(e){
    console.error('Erro GET /schools/classes/featured/stats:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

router.get('/classes/:id/stats', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { id } = req.params;
    if(!validateUUID(id)) return res.status(400).json({ success:false, message:'ID inválido' });

    // Garantir que a tabela external_applications existe
    await pool.query(`CREATE TABLE IF NOT EXISTS external_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID,
      student_email TEXT,
      student_name TEXT,
      student_id UUID,
      job_title TEXT,
      company_name TEXT,
      external_url TEXT,
      status TEXT DEFAULT 'applied',
      applied_at TIMESTAMP,
      notes TEXT,
      source_file TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    // Verificar se a turma pertence à escola
    const check = await pool.query('SELECT id, name FROM school_classes WHERE id=$1 AND school_id=$2 LIMIT 1',[id, schoolId]);
    if (check.rows.length===0) return res.status(404).json({ success:false, message:'Turma não encontrada' });
    const classInfo = { id: check.rows[0].id, name: check.rows[0].name };

    // Totais básicos da turma
    const [rTotal, rWithoutResumes, rWithoutApps, rByStatus, rStudentsWithApps] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM students WHERE school_id=$1 AND class_id=$2`, [schoolId, id]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM students s
        WHERE s.school_id=$1 AND s.class_id=$2
          AND NOT EXISTS (SELECT 1 FROM resumes r WHERE r.user_id=s.user_id)
      `, [schoolId, id]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM students s
        WHERE s.school_id=$1 AND s.class_id=$2
          AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.candidate_id=s.user_id)
          AND NOT EXISTS (SELECT 1 FROM external_applications ea WHERE ea.student_id=s.user_id)
      `, [schoolId, id]),
      pool.query(`
        SELECT s.status, COUNT(*)::int AS count
        FROM students s
        WHERE s.school_id=$1 AND s.class_id=$2
        GROUP BY s.status
      `, [schoolId, id]),
      pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS count FROM (
          SELECT s.user_id FROM students s JOIN applications a ON a.candidate_id=s.user_id WHERE s.school_id=$1 AND s.class_id=$2
          UNION
          SELECT s.user_id FROM students s JOIN external_applications ea ON ea.student_id=s.user_id WHERE s.school_id=$1 AND s.class_id=$2
        ) combined
      `, [schoolId, id])
    ]);

    const totalStudents = rTotal.rows[0]?.total || 0;
    const withoutResumes = rWithoutResumes.rows[0]?.count || 0;
    const withoutApps = rWithoutApps.rows[0]?.count || 0;
    const studentsByStatus = rByStatus.rows;
    const studentsWithApplications = rStudentsWithApps.rows[0]?.count || 0;

    // Empregabilidade da turma
    await pool.query(`
      ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_canceled_by_company BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_rejected_by_candidate BOOLEAN DEFAULT FALSE
    `);

    const [
      rHired,
      rHiredFromInterviews,
      rInterviewsActive,
      rInterviewsActiveDistinct,
      rInterviewsTotal,
      rInterviewsTotalDistinct,
      rApplications
    ] = await Promise.all([
      pool.query(`
        SELECT (
          COALESCE((SELECT COUNT(DISTINCT a.candidate_id) FROM applications a JOIN students s ON s.user_id=a.candidate_id WHERE s.school_id=$1 AND s.class_id=$2 AND COALESCE(a.final_approved,false)=true), 0)
          + COALESCE((SELECT COUNT(DISTINCT ea.student_id) FROM external_applications ea JOIN students s ON s.user_id=ea.student_id WHERE s.school_id=$1 AND s.class_id=$2 AND LOWER(ea.status) IN ('hired','contratado','aprovado','accepted','approved')), 0)
        )::int AS count
      `,[schoolId, id]),
      // Contratados que passaram por entrevista (entrevista aconteceu)
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.class_id=$2 
          AND COALESCE(a.final_approved,false)=true
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
      `,[schoolId, id]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.class_id=$2
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
      `,[schoolId, id]),
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.class_id=$2
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
      `,[schoolId, id]),
      // Total de entrevistas (histórico, excluindo canceladas/rejeitadas)
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.class_id=$2
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
      `,[schoolId, id]),
      // Total de alunos distintos que passaram por entrevista (histórico, excluindo canceladas/rejeitadas)
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1 AND s.class_id=$2
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
      `,[schoolId, id]),
      pool.query(`
        SELECT (COALESCE(internal.cnt,0) + COALESCE(external.cnt,0))::int AS count
        FROM
          (SELECT COUNT(*)::int AS cnt FROM applications a JOIN students s ON s.user_id=a.candidate_id WHERE s.school_id=$1 AND s.class_id=$2) internal,
          (SELECT COUNT(*)::int AS cnt FROM external_applications ea JOIN students s ON s.user_id=ea.student_id WHERE s.school_id=$1 AND s.class_id=$2) external
      `,[schoolId, id])
    ]);

    const hiredStudents = rHired.rows[0]?.count || 0;
    const hiredFromInterviews = rHiredFromInterviews.rows[0]?.count || 0; // contratados que passaram por entrevista
    const interviewsActive = rInterviewsActive.rows[0]?.count || 0; // entrevistas ativas
    const interviewsActiveDistinctStudents = rInterviewsActiveDistinct.rows[0]?.count || 0;
    const interviewsTotal = rInterviewsTotal.rows[0]?.count || 0; // histórico total (todas as entrevistas)
    const interviewsTotalDistinctStudents = rInterviewsTotalDistinct.rows[0]?.count || 0; // alunos que já tiveram entrevista em algum momento
    const applications = rApplications.rows[0]?.count || 0;

    const rates = {
      employed_pct_all_students: totalStudents>0 ? Math.round((hiredStudents/totalStudents)*1000)/10 : 0,
      // porcentagem de alunos que já tiveram qualquer entrevista (histórico completo)
      interviews_pct_students: totalStudents>0 ? Math.round((interviewsTotalDistinctStudents/totalStudents)*1000)/10 : 0,
      applicants_pct: totalStudents>0 ? Math.round((studentsWithApplications/totalStudents)*1000)/10 : 0,
    };

    res.json({
      success:true,
      class: classInfo,
      stats: {
        total_students: totalStudents,
        students_without_resumes: withoutResumes,
        students_without_applications: withoutApps,
        students_by_status: studentsByStatus
      },
      employability: {
        totals: { total_students: totalStudents, students_with_applications: studentsWithApplications },
        counts: { 
          hired_students: hiredStudents, 
          hired_from_interviews: hiredFromInterviews,
          interviews_active: interviewsActive, 
          interviews_active_distinct_students: interviewsActiveDistinctStudents, 
          interviews_total: interviewsTotal,
          interviews_total_distinct_students: interviewsTotalDistinctStudents,
          applications 
        },
        rates
      }
    });
  } catch(e){
    console.error('Erro GET /schools/classes/:id/stats:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Criar novo estudante
router.post('/students', authenticateToken, requireSchool, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS students_limit INTEGER`);
    // Checar limite de alunos antes de criar
    const lic = await client.query(`
      SELECT 
        (SELECT students_limit FROM users WHERE id=$1) as students_limit,
        COUNT(*)::int as students_count
      FROM students WHERE school_id=$1
    `,[req.user.id]);
    const studentsLimit = lic.rows[0]?.students_limit;
    const studentsCount = lic.rows[0]?.students_count ?? 0;
    if (studentsLimit !== null && studentsLimit !== undefined && studentsCount >= studentsLimit) {
      return res.status(400).json({ success:false, code:'STUDENTS_LIMIT_REACHED', message:`Limite de alunos (${studentsLimit}) atingido para esta escola.` });
    }
    await client.query('BEGIN');

    const {
      name, email, password, cpf, phone, course_id,
      student_registration, enrollment_date, current_semester, total_semesters,
      emergency_contact_name, emergency_contact_phone, birth_date, gender, notes,
      class_id
    } = req.body;

    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }

    // Verificar se email já existe
    const emailExists = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }

    // Verificar se matrícula já existe na escola
    if (student_registration) {
      const registrationExists = await client.query(
        'SELECT id FROM students WHERE school_id = $1 AND student_registration = $2',
        [req.user.id, student_registration]
      );

      if (registrationExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Número de matrícula já existe nesta escola'
        });
      }
    }

    // Criar usuário
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(`
      INSERT INTO users (email, password, name, cpf, phone, type, created_at)
      VALUES ($1, $2, $3, $4, $5, 'candidate', NOW())
      RETURNING id
    `, [email, hashedPassword, name, cpf, phone]);

    const userId = userResult.rows[0].id;

    // Criar registro de estudante
    // Garantir coluna class_id na tabela students
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES school_classes(id) ON DELETE SET NULL`);
    const studentResult = await client.query(`
      INSERT INTO students (
        user_id, school_id, course_id, student_registration, enrollment_date,
        current_semester, total_semesters, emergency_contact_name, 
        emergency_contact_phone, birth_date, gender, notes, class_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `, [
      userId, req.user.id, course_id, student_registration, enrollment_date,
      current_semester, total_semesters, emergency_contact_name,
      emergency_contact_phone, birth_date, gender, notes, class_id || null
    ]);

    await client.query('COMMIT');

    // Buscar dados completos do estudante criado
    const completeStudent = await pool.query(`
      SELECT 
        s.*, u.name, u.email, u.phone, u.cpf,
        c.name as course_name, c.level as course_level
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = $1
    `, [studentResult.rows[0].id]);

    res.status(201).json({
      success: true,
      student: completeStudent.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar estudante:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
});

// Atualizar estudante
router.put('/students/:id', authenticateToken, requireSchool, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      name, email, cpf, phone, course_id, student_registration,
      current_semester, total_semesters, gpa, status, notes,
      emergency_contact_name, emergency_contact_phone, birth_date, gender
    } = req.body;

    // Verificar se o estudante pertence à escola
    const studentCheck = await client.query(`
      SELECT s.user_id FROM students s WHERE s.id = $1 AND s.school_id = $2
    `, [id, req.user.id]);

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estudante não encontrado'
      });
    }

    const userId = studentCheck.rows[0].user_id;

    // Atualizar dados do usuário
    await client.query(`
      UPDATE users 
      SET name = $1, email = $2, cpf = $3, phone = $4, updated_at = NOW()
      WHERE id = $5
    `, [name, email, cpf, phone, userId]);

    // Atualizar dados do estudante
    await client.query(`
      UPDATE students 
      SET course_id = $1, student_registration = $2, current_semester = $3,
          total_semesters = $4, gpa = $5, status = $6, notes = $7,
          emergency_contact_name = $8, emergency_contact_phone = $9,
          birth_date = $10, gender = $11, updated_at = NOW()
      WHERE id = $12
    `, [
      course_id, student_registration, current_semester, total_semesters,
      gpa, status, notes, emergency_contact_name, emergency_contact_phone,
      birth_date, gender, id
    ]);

    await client.query('COMMIT');

    // Buscar dados atualizados
    const updatedStudent = await pool.query(`
      SELECT 
        s.*, u.name, u.email, u.phone, u.cpf,
        c.name as course_name, c.level as course_level
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = $1
    `, [id]);

    res.json({
      success: true,
      student: updatedStudent.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar estudante:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
});

// Obter detalhes de um estudante específico (da escola)
// rotas específicas para listar alunos por presença de dados (devem vir antes da rota paramétrica)
// Listar alunos da escola que possuem currículos
console.log('🔧 Registrando rota GET /api/schools/students/with-resumes');
router.get('/students/with-resumes', authenticateToken, requireSchool, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await pool.query(`
      SELECT u.id as user_id, u.name, u.email, COUNT(r.id) as resumes_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN resumes r ON r.user_id = u.id
      WHERE s.school_id = $1
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(r.id) > 0
      ORDER BY resumes_count DESC
      LIMIT $2::int
    `, [req.user.id, limit]);

    res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Erro ao listar alunos com currículos:', error);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Listar alunos da escola que enviaram candidaturas
console.log('🔧 Registrando rota GET /api/schools/students/with-applications');
router.get('/students/with-applications', authenticateToken, requireSchool, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await pool.query(`
      SELECT u.id as user_id, u.name, u.email, COUNT(a.id) as applications_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN applications a ON a.candidate_id = u.id
      WHERE s.school_id = $1
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(a.id) > 0
      ORDER BY applications_count DESC
      LIMIT $2::int
    `, [req.user.id, limit]);

    res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Erro ao listar alunos com candidaturas:', error);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Listar alunos sem currículos (DEVE vir antes de /students/:id)
router.get('/students/without-resumes', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { class_id } = req.query;
    const extra = class_id ? ' AND s.class_id=$2' : '';
    const params = class_id ? [schoolId, class_id, limit, offset] : [schoolId, limit, offset];
    const r = await pool.query(`
      SELECT s.user_id, u.name, u.email, u.profile_image, c.name AS course_name, sc.name AS class_name
      FROM students s
      JOIN users u ON u.id=s.user_id
      LEFT JOIN courses c ON c.id=s.course_id
      LEFT JOIN school_classes sc ON sc.id=s.class_id
      WHERE s.school_id=$1${extra} AND NOT EXISTS (
        SELECT 1 FROM resumes r WHERE r.user_id=s.user_id
      )
      ORDER BY u.name ASC
      LIMIT $${class_id?3:2} OFFSET $${class_id?4:3}
    `, params);
    res.json({ success:true, rows: r.rows, pagination:{ limit, offset } });
  } catch (e) {
    console.error('Erro GET /schools/students/without-resumes:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Listar alunos sem candidaturas (DEVE vir antes de /students/:id)
router.get('/students/without-applications', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { class_id } = req.query;
    const extra = class_id ? ' AND s.class_id=$2' : '';
    const params = class_id ? [schoolId, class_id, limit, offset] : [schoolId, limit, offset];
    const r = await pool.query(`
      SELECT s.user_id, u.name, u.email, u.profile_image, c.name AS course_name, sc.name AS class_name
      FROM students s
      JOIN users u ON u.id=s.user_id
      LEFT JOIN courses c ON c.id=s.course_id
      LEFT JOIN school_classes sc ON sc.id=s.class_id
      WHERE s.school_id=$1${extra} AND NOT EXISTS (
        SELECT 1 FROM applications a WHERE a.candidate_id=s.user_id
      ) AND NOT EXISTS (
        SELECT 1 FROM external_applications ea WHERE ea.student_id=s.user_id
      )
      ORDER BY u.name ASC
      LIMIT $${class_id?3:2} OFFSET $${class_id?4:3}
    `, params);
    res.json({ success:true, rows: r.rows, pagination:{ limit, offset } });
  } catch (e) {
    console.error('Erro GET /schools/students/without-applications:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Listar alunos destacados
router.get('/students/featured', authenticateToken, requireSchool, async (req,res)=>{
  try {
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    const r = await pool.query(`
      SELECT s.id, s.user_id, u.name, u.email, u.profile_image, s.class_id, sc.name as class_name, s.is_featured
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN school_classes sc ON sc.id = s.class_id
      WHERE s.school_id=$1 AND COALESCE(s.is_featured,false)=true
      ORDER BY u.name
    `,[req.user.id]);
    res.json({ success:true, students: r.rows });
  } catch(e){ console.error('List featured students error',e); res.status(500).json({ success:false, message:'Erro ao listar destacados'}); }
});

// Destacar / remover destaque de um aluno
router.patch('/students/:id/toggle-feature', authenticateToken, requireSchool, async (req,res)=>{
  try {
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_students_limit INTEGER`);
    const { id } = req.params;
    const check = await pool.query('SELECT id, is_featured FROM students WHERE id=$1 AND school_id=$2',[id, req.user.id]);
    if(check.rows.length===0) return res.status(404).json({ success:false, message:'Estudante não encontrado'});
    const current = !!check.rows[0].is_featured;
    const next = !current;
    if (next) {
      const lic = await pool.query(`
        SELECT 
          (SELECT featured_students_limit FROM users WHERE id=$1) as featured_limit,
          COUNT(*) FILTER (WHERE COALESCE(is_featured,false)=true)::int as featured_count
        FROM students WHERE school_id=$1
      `,[req.user.id]);
      const featuredLimit = lic.rows[0]?.featured_limit;
      const featuredCount = lic.rows[0]?.featured_count ?? 0;
      if (featuredLimit !== null && featuredLimit !== undefined && featuredCount >= featuredLimit) {
        return res.status(400).json({ success:false, code:'FEATURED_LIMIT_REACHED', message:`Limite de alunos destacados (${featuredLimit}) atingido para esta escola.` });
      }
    }
    await pool.query('UPDATE students SET is_featured=$1, updated_at=NOW() WHERE id=$2',[next,id]);
    res.json({ success:true, id, is_featured: next });
  } catch(e){ console.error('Toggle feature student error',e); res.status(500).json({ success:false, message:'Erro ao alterar destaque'}); }
});

// Operações em lote sobre estudantes
// action: activate | deactivate | feature | unfeature | delete | assign_class | remove_class
router.post('/students/bulk', authenticateToken, requireSchool, async (req, res) => {
  const { action, ids, class_id } = req.body || {};
  if(!Array.isArray(ids) || ids.length===0) {
    return res.status(400).json({ success:false, message:'Lista de IDs é obrigatória' });
  }
  const validActions = ['activate','deactivate','feature','unfeature','delete','assign_class','remove_class'];
  if(!validActions.includes(action)) {
    return res.status(400).json({ success:false, message:'Ação inválida'});
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Garantir colunas
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES school_classes(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_students_limit INTEGER`);
    // Pré-calcular limite de destaque disponível
    let availableFeatured = null;
    if (action === 'feature') {
      const lic = await client.query(`
        SELECT 
          (SELECT featured_students_limit FROM users WHERE id=$1) as featured_limit,
          COUNT(*) FILTER (WHERE COALESCE(is_featured,false)=true)::int as featured_count
        FROM students WHERE school_id=$1
      `,[req.user.id]);
      const featuredLimit = lic.rows[0]?.featured_limit;
      const featuredCount = lic.rows[0]?.featured_count ?? 0;
      if (featuredLimit !== null && featuredLimit !== undefined) {
        availableFeatured = Math.max(0, featuredLimit - featuredCount);
      }
    }
    const results = [];
    for(const id of ids) {
      // validar pertencimento
      const st = await client.query('SELECT id, user_id, status, is_featured FROM students WHERE id=$1 AND school_id=$2',[id, req.user.id]);
      if(st.rows.length===0) { results.push({ id, error:'not_found' }); continue; }
      const row = st.rows[0];
      if(action === 'delete') {
        // deletar estudante + user
        await client.query('DELETE FROM students WHERE id=$1',[id]);
        if(row.user_id) await client.query('DELETE FROM users WHERE id=$1',[row.user_id]);
        results.push({ id, deleted:true });
        continue;
      }
      if(action === 'activate' || action === 'deactivate') {
        const newStatus = action === 'activate' ? 'active' : 'inactive';
        await client.query('UPDATE students SET status=$1, updated_at=NOW() WHERE id=$2',[newStatus, id]);
        await client.query('UPDATE users SET disabled=$1, updated_at=NOW() WHERE id=$2',[ newStatus==='inactive', row.user_id]);
        results.push({ id, status:newStatus });
        continue;
      }
      if(action === 'feature' || action === 'unfeature') {
        const next = action === 'feature';
        if (next) {
          if (row.is_featured) { results.push({ id, is_featured: true }); continue; }
          if (availableFeatured === null) {
            await client.query('UPDATE students SET is_featured=$1, updated_at=NOW() WHERE id=$2',[true, id]);
            results.push({ id, is_featured: true });
          } else if (availableFeatured > 0) {
            await client.query('UPDATE students SET is_featured=$1, updated_at=NOW() WHERE id=$2',[true, id]);
            availableFeatured -= 1;
            results.push({ id, is_featured: true });
          } else {
            results.push({ id, error:'featured_limit_reached' });
          }
        } else {
          await client.query('UPDATE students SET is_featured=$1, updated_at=NOW() WHERE id=$2',[false, id]);
          results.push({ id, is_featured: false });
        }
        continue;
      }
      if(action === 'assign_class') {
        if(!class_id) { results.push({ id, error:'missing_class_id'}); continue; }
        // validar turma pertence à escola
        const cls = await client.query('SELECT id FROM school_classes WHERE id=$1 AND school_id=$2',[class_id, req.user.id]);
        if(cls.rows.length===0) { results.push({ id, error:'class_not_found'}); continue; }
        await client.query('UPDATE students SET class_id=$1, updated_at=NOW() WHERE id=$2',[class_id, id]);
        results.push({ id, class_id });
        continue;
      }
      if(action === 'remove_class') {
        await client.query('UPDATE students SET class_id=NULL, updated_at=NOW() WHERE id=$1',[id]);
        results.push({ id, class_id:null });
        continue;
      }
    }
    await client.query('COMMIT');
    res.json({ success:true, action, results });
  } catch(e){
    await client.query('ROLLBACK');
    console.error('Bulk students action error:', e);
    res.status(500).json({ success:false, message:'Erro ao processar ação em lote'});
  } finally { client.release(); }
});

// Obter detalhes de um estudante específico (da escola)
router.get('/students/:id', authenticateToken, requireSchool, async (req, res) => {
  // debug log
  console.log('📥 GET /api/schools/students/:id', req.params.id);
  try {
    const { id } = req.params;
    if(!validateUUID(id)) return res.status(400).json({ success:false, message:'ID inválido' });
    
    // Buscar também o avatar da escola (profile_image da escola logada)
    const schoolAvatar = req.user.profile_image || null;
    
    const result = await pool.query(`
      SELECT 
        s.id, s.user_id, s.status, s.gpa, s.current_semester, s.total_semesters,
        s.student_registration, s.enrollment_date, s.birth_date, s.gender,
        u.name, u.email, u.phone, u.cpf, u.profile_image,
        u.linkedin_url, u.instagram_url, u.github_url, u.custom_url, u.life_status,
        u.resume_sections,
        c.name as course_name, c.level as course_level,
        sc.name as class_name, s.class_id, s.is_featured
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN school_classes sc ON s.class_id = sc.id
      WHERE s.id = $1 AND s.school_id = $2
      LIMIT 1
    `,[id, req.user.id]);
    let row = result.rows[0];
    // Fallback: talvez tenha sido passado o user_id em vez do id da tabela students
    if(!row){
      const byUser = await pool.query(`
        SELECT 
          s.id, s.user_id, s.status, s.gpa, s.current_semester, s.total_semesters,
          s.student_registration, s.enrollment_date, s.birth_date, s.gender,
          u.name, u.email, u.phone, u.cpf, u.profile_image,
          u.linkedin_url, u.instagram_url, u.github_url, u.custom_url, u.life_status,
          u.resume_sections,
          c.name as course_name, c.level as course_level,
          sc.name as class_name, s.class_id, s.is_featured
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN school_classes sc ON s.class_id = sc.id
        WHERE s.user_id = $1 AND s.school_id = $2
        LIMIT 1
      `,[id, req.user.id]);
      row = byUser.rows[0];
    }
    if(!row) return res.status(404).json({ success:false, message:'Estudante não encontrado' });
    
    // Adicionar school_avatar ao resultado
    row.school_avatar = schoolAvatar;
    
    res.json({ success:true, student: row });
  } catch (e) {
    console.error('Erro ao obter estudante:', e);
    res.status(500).json({ success:false, message:'Erro interno do servidor' });
  }
});

// Listar alunos destacados
router.get('/students/featured', authenticateToken, requireSchool, async (req,res)=>{
  try {
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    const r = await pool.query(`
      SELECT s.id, s.user_id, u.name, u.email, u.profile_image, s.class_id, sc.name as class_name, s.is_featured
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN school_classes sc ON sc.id = s.class_id
      WHERE s.school_id=$1 AND COALESCE(s.is_featured,false)=true
      ORDER BY u.name
    `,[req.user.id]);
    res.json({ success:true, students: r.rows });
  } catch(e){ console.error('List featured students error',e); res.status(500).json({ success:false, message:'Erro ao listar destacados'}); }
});

// Destacar / remover destaque de um aluno
router.patch('/students/:id/toggle-feature', authenticateToken, requireSchool, async (req,res)=>{
  try {
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    const { id } = req.params;
    const check = await pool.query('SELECT id, is_featured FROM students WHERE id=$1 AND school_id=$2',[id, req.user.id]);
    if(check.rows.length===0) return res.status(404).json({ success:false, message:'Estudante não encontrado'});
    const current = !!check.rows[0].is_featured;
    const next = !current;
    await pool.query('UPDATE students SET is_featured=$1, updated_at=NOW() WHERE id=$2',[next,id]);
    res.json({ success:true, id, is_featured: next });
  } catch(e){ console.error('Toggle feature student error',e); res.status(500).json({ success:false, message:'Erro ao alterar destaque'}); }
});

// Desabilitar/Habilitar estudante (toggle status: ativo <-> inativo)
router.patch('/students/:id/toggle-status', authenticateToken, requireSchool, async (req, res) => {
  console.log('🔄 PATCH toggle-status estudante', req.params.id);
  try {
    const { id } = req.params;
    // Verificar se pertence à escola
    const check = await pool.query('SELECT id, status FROM students WHERE id = $1 AND school_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ success:false, message:'Estudante não encontrado' });
  let currentRaw = (check.rows[0].status||'').toLowerCase();
  // Map legacy pt-BR values to english accepted by CHECK
  if(currentRaw === 'ativo') currentRaw = 'active';
  if(currentRaw === 'inativo') currentRaw = 'inactive';
  const current = currentRaw === 'inactive' ? 'inactive' : 'active';
  const next = current === 'active' ? 'inactive' : 'active';
  await pool.query('UPDATE students SET status = $1, updated_at = NOW() WHERE id = $2', [next, id]);
  // sincronizar campo disabled do usuário (admin panel)
  await pool.query(`UPDATE users SET disabled = $1, updated_at = NOW() WHERE id = (SELECT user_id FROM students WHERE id = $2)`, [next === 'inactive', id]);
  res.json({ success:true, id, status: next, status_display: next === 'active' ? 'Ativo' : 'Inativo' });
  } catch (e) {
    console.error('Erro ao alternar status do estudante:', e);
    res.status(500).json({ success:false, message:'Erro interno do servidor' });
  }
});

// Remover estudante (deleta registro students e usuário associado)
router.delete('/students/:id', authenticateToken, requireSchool, async (req, res) => {
  console.log('🗑️  DELETE estudante', req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const s = await client.query('SELECT user_id FROM students WHERE id = $1 AND school_id = $2', [id, req.user.id]);
    if (s.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success:false, message:'Estudante não encontrado' });
    }
    const userId = s.rows[0].user_id;
    await client.query('DELETE FROM students WHERE id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.json({ success:true, id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar estudante:', e);
    res.status(500).json({ success:false, message:'Erro interno do servidor' });
  } finally { client.release(); }
});

// ========== ROTAS DE AVALIAÇÕES ==========

// Listar avaliações de um estudante
router.get('/students/:student_id/evaluations', authenticateToken, requireSchool, async (req, res) => {
  try {
    const { student_id } = req.params;

    // Verificar se o estudante pertence à escola
    const studentCheck = await pool.query(`
      SELECT id FROM students WHERE id = $1 AND school_id = $2
    `, [student_id, req.user.id]);

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estudante não encontrado'
      });
    }

    const result = await pool.query(`
      SELECT 
        e.*, u.name as evaluator_name
      FROM student_evaluations e
      JOIN users u ON e.evaluator_id = u.id
      WHERE e.student_id = $1
      ORDER BY e.evaluation_date DESC, e.created_at DESC
    `, [student_id]);

    res.json({
      success: true,
      evaluations: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Criar avaliação para estudante
router.post('/students/:student_id/evaluations', authenticateToken, requireSchool, async (req, res) => {
  try {
    const { student_id } = req.params;
    const {
      subject, evaluation_type, score, max_score, grade, comments,
      evaluation_date, semester, year
    } = req.body;

    // Verificar se o estudante pertence à escola
    const studentCheck = await pool.query(`
      SELECT id FROM students WHERE id = $1 AND school_id = $2
    `, [student_id, req.user.id]);

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estudante não encontrado'
      });
    }

    const result = await pool.query(`
      INSERT INTO student_evaluations (
        student_id, evaluator_id, subject, evaluation_type, score, max_score,
        grade, comments, evaluation_date, semester, year, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
      student_id, req.user.id, subject, evaluation_type, score, max_score,
      grade, comments, evaluation_date, semester, year
    ]);

    res.status(201).json({
      success: true,
      evaluation: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ========== EXPORTAÇÃO EXCEL ==========

// Exportar estudantes para Excel
router.get('/export/students', authenticateToken, requireSchool, async (req, res) => {
  try {
    const { course_id, status } = req.query;
    
    let whereConditions = ['s.school_id = $1'];
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (course_id) {
      paramCount++;
      whereConditions.push(`s.course_id = $${paramCount}`);
      queryParams.push(course_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`s.status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    // Buscar dados dos estudantes
    // Tentar adicionar coluna initial_password se não existir (para exportação de senhas iniciais solicitada)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_password VARCHAR(255);`);

    const studentsResult = await pool.query(`
      SELECT 
        u.name as "Nome",
        u.email as "Email",
        u.cpf as "CPF",
        u.phone as "Telefone",
        c.name as "Curso",
        c.level as "Nível",
        s.student_registration as "Matrícula",
        s.enrollment_date as "Data Matrícula",
        s.current_semester as "Semestre Atual",
        s.total_semesters as "Total Semestres",
        s.gpa as "Média Geral",
        s.status as "Status",
        s.birth_date as "Data Nascimento",
        s.gender as "Gênero",
        u.initial_password as "Senha Inicial",
        COALESCE(r.resumes_count,0) as "Currículos",
        COALESCE(a.applications_count,0) as "Candidaturas",
        s.emergency_contact_name as "Contato Emergência",
        s.emergency_contact_phone as "Telefone Emergência",
        s.notes as "Observações"
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) resumes_count FROM resumes GROUP BY user_id
      ) r ON r.user_id = s.user_id
      LEFT JOIN (
        SELECT candidate_id, COUNT(*) applications_count FROM applications GROUP BY candidate_id
      ) a ON a.candidate_id = s.user_id
      WHERE ${whereClause}
      ORDER BY u.name
    `, queryParams);

    // Buscar avaliações (média por estudante)
    const evaluationsResult = await pool.query(`
      SELECT 
        s.id as student_id,
        u.name,
        AVG(e.score) as media_notas,
        COUNT(e.id) as total_avaliacoes,
        string_agg(DISTINCT e.subject, ', ') as materias
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_evaluations e ON s.id = e.student_id
      WHERE ${whereClause}
      GROUP BY s.id, u.name
      ORDER BY u.name
    `, queryParams);

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // Aba 1: Dados dos Estudantes
    const studentsWorksheet = XLSX.utils.json_to_sheet(studentsResult.rows);
    XLSX.utils.book_append_sheet(workbook, studentsWorksheet, 'Estudantes');

    // Aba 2: Análise de Desempenho
    const performanceData = evaluationsResult.rows.map(row => ({
      'Nome': row.name,
      'Média das Notas': row.media_notas ? parseFloat(row.media_notas).toFixed(2) : 'N/A',
      'Total de Avaliações': row.total_avaliacoes,
      'Matérias': row.materias || 'Nenhuma'
    }));
    
    const performanceWorksheet = XLSX.utils.json_to_sheet(performanceData);
    XLSX.utils.book_append_sheet(workbook, performanceWorksheet, 'Análise de Desempenho');

    // Gerar buffer do Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Configurar headers para download
    const fileName = `estudantes_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    res.send(excelBuffer);

  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ========== IMPORTAÇÃO EXCEL/CSV ========== 
router.post('/students/import', authenticateToken, requireSchool, upload.single('file'), async (req, res) => {
  try {
    if(!req.file) {
      return res.status(400).json({ success:false, message:'Arquivo não enviado' });
    }
    const original = req.file.originalname.toLowerCase();
    if(!/\.(xlsx|xls|csv)$/.test(original)) {
      return res.status(400).json({ success:false, message:'Formato inválido. Use .xlsx, .xls ou .csv' });
    }

    let rows = [];
    if(original.endsWith('.csv')) {
      // Conversão simples CSV -> linhas
      const text = req.file.buffer.toString('utf8');
      const lines = text.split(/\r?\n/).filter(l=>l.trim()!=='');
      const headers = lines.shift().split(',').map(h=>h.trim());
      rows = lines.map(line => {
        const cols = line.split(',');
        const obj = {};
        headers.forEach((h,i)=> obj[h] = cols[i] ? cols[i].trim() : '');
        return obj;
      });
    } else {
      const workbook = XLSX.read(req.file.buffer, { type:'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval:'' });
    }

    // Normalizar chaves esperadas (possíveis cabeçalhos do template)
    const stripDiacritics = (s='') => s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : s;
    const mapKey = (k='') => stripDiacritics(k.toString())
      .toLowerCase()
      .replace(/\s+/g,'')
      .replace(/[^a-z0-9_]/g,'');

    const summary = { total: rows.length, created:0, errors:0 };
    const results = [];

    // Conversor Excel serial date -> ISO YYYY-MM-DD (assume 1900 system)
    const excelSerialToISO = (serial) => {
      try {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30 corrige bug do 29/02/1900
        const ms = Math.round(serial * 24 * 60 * 60 * 1000);
        const d = new Date(excelEpoch.getTime() + ms);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2,'0');
        const dd = String(d.getUTCDate()).padStart(2,'0');
        return `${yyyy}-${mm}-${dd}`;
      } catch { return null; }
    };

    // Função utilitária para normalizar data (aceita YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Date, número Excel)
    const normalizeDate = (val) => {
      if(val === null || val === undefined) return null;
      // Date object
      if (val instanceof Date && !isNaN(val)) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth()+1).padStart(2,'0');
        const dd = String(val.getDate()).padStart(2,'0');
        return `${yyyy}-${mm}-${dd}`;
      }
      // Excel serial number
      if (typeof val === 'number') {
        return excelSerialToISO(val);
      }
      // String patterns
      if(typeof val !== 'string') return null;
      const trimmed = val.trim();
      if(trimmed === '') return null;
      if(/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      const m = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
      if(m){
        const [,d,mn,y] = m;
        if(parseInt(d)<=31 && parseInt(mn)<=12){
          return `${y}-${mn}-${d}`;
        }
      }
      return null; // inválido -> retorna null para não quebrar INSERT
    };

    // Checar limites de alunos antes de importar
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS students_limit INTEGER`);
    let importSlots = null;
    const licStudents = await pool.query(`
      SELECT 
        (SELECT students_limit FROM users WHERE id=$1) as students_limit,
        COUNT(*)::int as students_count
      FROM students WHERE school_id=$1
    `,[req.user.id]);
    const studentsLimit = licStudents.rows[0]?.students_limit;
    const studentsCount = licStudents.rows[0]?.students_count ?? 0;
    if (studentsLimit !== null && studentsLimit !== undefined) {
      importSlots = Math.max(0, studentsLimit - studentsCount);
      if (importSlots === 0) {
        return res.status(400).json({ success:false, code:'STUDENTS_LIMIT_REACHED', message:`Limite de alunos (${studentsLimit}) atingido. Nenhum aluno foi importado.` });
      }
    }

    for(let i=0;i<rows.length;i++) {
      const raw = rows[i];
      // Construir objeto padronizado
      // Cabeçalhos esperados conforme README
      const normalized = {};
      for(const key of Object.keys(raw)) {
        const mk = mapKey(key);
        normalized[mk] = raw[key];
      }
      // Extrair campos
  const safeStr = (v) => (v === null || v === undefined) ? '' : String(v);
  const name = safeStr(normalized['nome'] || normalized['name']).trim();
  const email = safeStr(normalized['email']).trim();
  const passwordRaw = normalized['senha'] || normalized['password'] || normalized['novasenha'];
  const password = safeStr(passwordRaw) || Math.random().toString(36).slice(-10);
  const cpf = (normalized['cpf']||'').replace(/[^0-9]/g,'');
  // aceitar 'Telefone' com máscara e normalizar para string limpa (mantém como digitado; DB armazena string)
  const rawPhone = normalized['telefone'] || normalized['phone'] || '';
  const phone = typeof rawPhone === 'string' ? rawPhone.trim() : String(rawPhone||'');
  const class_name = normalized['turma'] || null;
      const student_registration = normalized['matricula'] || normalized['studentregistration'] || null;
      const course_id = normalized['cursoid'] || normalized['courseid'] || null;
  const enrollment_date_raw = normalized['datamatricula(yyyy-mm-dd)'] || normalized['datamatricula'] || null;
      const current_semester = normalized['semestreatual'] || null;
      const total_semesters = normalized['totalsemestres'] || null;
      const emergency_contact_name = normalized['contatoemergencianome'] || null;
      const emergency_contact_phone = normalized['contatoemergenciatelefone'] || null;
  const birth_date_raw = normalized['datanascimento(yyyy-mm-dd)'] || normalized['datanascimento'] || normalized['datadenascimento'] || normalized['datadenascimento(yyyy-mm-dd)'] || null;
      const gender = normalized['genero'] || normalized['genero(seaplicavel)'] || null;
      const notes = normalized['observacoes'] || normalized['notes'] || null;
  const statusRaw = normalized['status'] || null; // aceito mas ignorado na criação (sempre active por padrão)

  const enrollment_date = normalizeDate(enrollment_date_raw);
  const birth_date = normalizeDate(birth_date_raw);

      // Validações básicas
      if(!name || !email) {
        summary.errors++; results.push({ row:i+2, email, status:'error', message:'Nome e Email são obrigatórios' }); continue;
      }
      try {
        // Checar duplicidade email
        const emailExists = await pool.query('SELECT 1 FROM users WHERE lower(email)=lower($1)', [email]);
        if(emailExists.rows.length>0) { summary.errors++; results.push({ row:i+2, email, status:'error', message:'Email já existe' }); continue; }
        if(student_registration){
          const regExists = await pool.query('SELECT 1 FROM students WHERE school_id=$1 AND student_registration=$2', [req.user.id, student_registration]);
          if(regExists.rows.length>0) { summary.errors++; results.push({ row:i+2, email, status:'error', message:'Matrícula já existe' }); continue; }
        }
        // Verificar slots restantes
        if (importSlots !== null && importSlots <= 0) {
          summary.errors++; results.push({ row:i+2, email, status:'error', message:`Limite de alunos atingido durante a importação` }); continue;
        }

        // Criar usuário + estudante em transação
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const bcrypt = await import('bcryptjs');
            const hashed = await bcrypt.default.hash(String(password),10);
          // Garantir coluna initial_password
          await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_password VARCHAR(255)`);
          const userRes = await client.query(`INSERT INTO users (email,password,name,cpf,phone,type,initial_password,created_at) VALUES ($1,$2,$3,$4,$5,'candidate',$6,NOW()) RETURNING id`, [email, hashed, name, cpf||null, phone||null, String(password)]);
          const userId = userRes.rows[0].id;
          // Garantir tabela e coluna class_id
          await client.query(`CREATE TABLE IF NOT EXISTS school_classes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, name VARCHAR(120) NOT NULL, description TEXT, year INTEGER, shift VARCHAR(30), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
          await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES school_classes(id) ON DELETE SET NULL`);
          let classId = null;
          if(class_name){
            const existingClass = await client.query(`SELECT id FROM school_classes WHERE school_id=$1 AND lower(name)=lower($2) LIMIT 1`, [req.user.id, class_name]);
            if(existingClass.rows.length>0) classId = existingClass.rows[0].id; else {
              const createdClass = await client.query(`INSERT INTO school_classes (school_id,name) VALUES ($1,$2) RETURNING id`, [req.user.id, class_name]);
              classId = createdClass.rows[0].id;
            }
          }
          await client.query(`INSERT INTO students (user_id,school_id,course_id,student_registration,enrollment_date,current_semester,total_semesters,emergency_contact_name,emergency_contact_phone,birth_date,gender,notes,class_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`, [userId, req.user.id, course_id||null, student_registration, enrollment_date||null, current_semester? parseInt(current_semester): null, total_semesters? parseInt(total_semesters): null, emergency_contact_name, emergency_contact_phone, birth_date||null, gender, notes, classId]);
          await client.query('COMMIT');
          summary.created++; results.push({ row:i+2, email, status:'created', initial_password: password });
          if (importSlots !== null) importSlots -= 1;
        } catch(txErr){
          await client.query('ROLLBACK');
          summary.errors++; results.push({ row:i+2, email, status:'error', message: txErr.message });
        } finally { client.release(); }
      } catch(lineErr){
        summary.errors++; results.push({ row:i+2, email, status:'error', message: lineErr.message });
      }
    }

    res.json({ success:true, summary, results });
  } catch (error) {
    console.error('Erro ao importar alunos:', error);
    res.status(500).json({ success:false, message:'Erro ao importar alunos' });
  }
});

// ========== ATIVIDADE (CURRÍCULOS E CANDIDATURAS) ==========
router.get('/students/activity', authenticateToken, requireSchool, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        COALESCE(r.resumes_count,0) as resumes_count,
        COALESCE(a.applications_count,0) as applications_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as resumes_count FROM resumes GROUP BY user_id
      ) r ON r.user_id = u.id
      LEFT JOIN (
        SELECT candidate_id as user_id, COUNT(*) as int_count FROM applications GROUP BY candidate_id
      ) a ON a.user_id = u.id
      LEFT JOIN (
        SELECT student_id as user_id, COUNT(*) as ext_count FROM external_applications GROUP BY student_id
      ) ea ON ea.user_id = u.id
      WHERE s.school_id = $1
      ORDER BY u.name
    `, [req.user.id]);
    // Merge internal + external counts
    result.rows.forEach(row => {
      row.applications_count = (parseInt(row.int_count) || 0) + (parseInt(row.ext_count) || 0);
    });
    res.json({ success:true, activity: result.rows });
  } catch (e) {
    console.error('Erro atividade alunos:', e); res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// ========== TURMAS (CLASSES) ==========
const ensureClassesInfra = async () => {
  // Ensure pgcrypto (gen_random_uuid) is available; fallback for uuid generation
  try { await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`); } catch (e) { /* ignore if not permitted */ }
  await pool.query(`CREATE TABLE IF NOT EXISTS school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    year INTEGER,
    shift VARCHAR(30),
    job_area VARCHAR(100),
    job_subarea VARCHAR(100),
    job_location VARCHAR(120),
    job_work_type VARCHAR(30),
    job_contract_type VARCHAR(30),
    job_experience_level VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES school_classes(id) ON DELETE SET NULL`);
  // Lazy add columns (para instalações existentes)
  await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_area VARCHAR(100)`);
  await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_subarea VARCHAR(100)`);
  await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_location VARCHAR(120)`);
  await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_work_type VARCHAR(30)`);
  await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_contract_type VARCHAR(30)`);
  await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_experience_level VARCHAR(30)`);
};

// Listar turmas
router.get('/classes', authenticateToken, requireSchool, async (req,res)=>{
  try { await ensureClassesInfra();
  const r = await pool.query(`SELECT id,name,description,year,shift,job_area,job_subarea,job_location,job_work_type,job_contract_type,job_experience_level,created_at FROM school_classes WHERE school_id=$1 ORDER BY name`,[req.user.id]);
    res.json({ success:true, classes:r.rows });
  } catch(e){ console.error('List classes error',e); res.status(500).json({ success:false, message:'Erro ao listar turmas'}); }
});

// Criar turma
router.post('/classes', authenticateToken, requireSchool, async (req,res)=>{
  try { await ensureClassesInfra();
  const { name, description, year, shift, job_area, job_subarea, job_location, job_work_type, job_contract_type, job_experience_level } = req.body;
    if(!name) return res.status(400).json({ success:false, message:'Nome é obrigatório' });
    const exists = await pool.query(`SELECT 1 FROM school_classes WHERE school_id=$1 AND lower(name)=lower($2)`,[req.user.id,name]);
    if(exists.rows.length>0) return res.status(400).json({ success:false, message:'Já existe turma com este nome'});
  const ins = await pool.query(`INSERT INTO school_classes (school_id,name,description,year,shift,job_area,job_subarea,job_location,job_work_type,job_contract_type,job_experience_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[req.user.id,name,description||null,year||null,shift||null,job_area||null,job_subarea||null,job_location||null,job_work_type||null,job_contract_type||null,job_experience_level||null]);
    res.status(201).json({ success:true, class:ins.rows[0] });
  } catch(e){ console.error('Create class error',e); res.status(500).json({ success:false, message:'Erro ao criar turma'}); }
});

// Atualizar turma
router.put('/classes/:id', authenticateToken, requireSchool, async (req,res)=>{
  try { await ensureClassesInfra();
  const { id } = req.params; const { name, description, year, shift, job_area, job_subarea, job_location, job_work_type, job_contract_type, job_experience_level } = req.body;
    const check = await pool.query(`SELECT id FROM school_classes WHERE id=$1 AND school_id=$2`,[id, req.user.id]);
    if(check.rows.length===0) return res.status(404).json({ success:false, message:'Turma não encontrada' });
    if(name){
      const dup = await pool.query(`SELECT 1 FROM school_classes WHERE school_id=$1 AND lower(name)=lower($2) AND id<>$3`,[req.user.id,name,id]);
      if(dup.rows.length>0) return res.status(400).json({ success:false, message:'Nome já em uso' });
    }
  const upd = await pool.query(`UPDATE school_classes SET name=COALESCE($1,name), description=$2, year=$3, shift=$4, job_area=$5, job_subarea=$6, job_location=$7, job_work_type=$8, job_contract_type=$9, job_experience_level=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,[name, description||null, year||null, shift||null, job_area||null, job_subarea||null, job_location||null, job_work_type||null, job_contract_type||null, job_experience_level||null, id]);
    res.json({ success:true, class:upd.rows[0] });
  } catch(e){ console.error('Update class error',e); res.status(500).json({ success:false, message:'Erro ao atualizar turma'}); }
});

// Remover turma (se não tiver alunos ou apenas desvincular)
router.delete('/classes/:id', authenticateToken, requireSchool, async (req,res)=>{
  try { await ensureClassesInfra();
    const { id } = req.params;
    const check = await pool.query(`SELECT id FROM school_classes WHERE id=$1 AND school_id=$2`,[id, req.user.id]);
    if(check.rows.length===0) return res.status(404).json({ success:false, message:'Turma não encontrada' });
    const studentCount = await pool.query(`SELECT COUNT(*) FROM students WHERE class_id=$1`,[id]);
    if(parseInt(studentCount.rows[0].count)>0) {
      // Apenas limpa vínculo (bulk) e depois apaga
      await pool.query(`UPDATE students SET class_id=NULL WHERE class_id=$1`,[id]);
    }
    await pool.query(`DELETE FROM school_classes WHERE id=$1`,[id]);
    res.json({ success:true, removed:true });
  } catch(e){ console.error('Delete class error',e); res.status(500).json({ success:false, message:'Erro ao remover turma'}); }
});

// Listar alunos destacados (featured)
router.get('/classes/featured/students', authenticateToken, requireSchool, async (req,res)=>{
  try { 
    await ensureClassesInfra();
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    const r = await pool.query(`
      SELECT 
        s.id as student_id,
        u.id as user_id,
        u.name, u.email,
        u.phone, u.cpf,
        u.profile_image,
        s.status, s.is_featured,
        s.birth_date, s.gender,
        c.name as course_name,
        sc.name as class_name,
        -- métricas agregadas
        (COUNT(rz.id) > 0) AS has_resume,
        COUNT(rz.id) AS resumes_count,
        COUNT(a.id) AS applications_count,
        -- Entrevista inferida por aprovado/rejeitado/final
        BOOL_OR(COALESCE(a.final_approved,false) OR a.status IN ('approved','rejected')) AS has_interview,
        BOOL_OR(COALESCE(a.final_approved,false)) AS final_approved,
        -- Pré-aprovado também verdadeiro quando há aprovado final
        BOOL_OR(COALESCE(a.final_approved,false) OR a.status='approved') AS pre_approved,
        BOOL_OR(a.status='rejected') AS rejected
      FROM students s 
      JOIN users u ON s.user_id=u.id 
      LEFT JOIN courses c ON c.id=s.course_id
      LEFT JOIN school_classes sc ON sc.id=s.class_id
      LEFT JOIN resumes rz ON rz.user_id = s.user_id
      LEFT JOIN applications a ON a.candidate_id = s.user_id
      WHERE s.school_id=$1 AND s.is_featured=true
      GROUP BY s.id, u.id, u.name, u.email, u.phone, u.cpf, u.profile_image, s.status, s.is_featured, s.birth_date, s.gender, c.name, sc.name
      ORDER BY u.name
    `,[req.user.id]);
    res.json({ success:true, students:r.rows });
  } catch(e){ 
    console.error('List featured students error',e); 
    res.status(500).json({ success:false, message:'Erro ao listar alunos destacados'}); 
  }
});

// Listar alunos de uma turma
router.get('/classes/:id/students', authenticateToken, requireSchool, async (req,res)=>{
  try { await ensureClassesInfra();
    const { id } = req.params;
    const check = await pool.query(`SELECT id FROM school_classes WHERE id=$1 AND school_id=$2`,[id, req.user.id]);
    if(check.rows.length===0) return res.status(404).json({ success:false, message:'Turma não encontrada' });
  await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
  const r = await pool.query(`
    SELECT 
      s.id as student_id,
      u.id as user_id,
      u.name, u.email,
      u.phone, u.cpf,
      u.profile_image,
      s.status, s.is_featured,
      s.birth_date, s.gender,
      c.name as course_name,
      sc.name as class_name,
      -- métricas agregadas
  (COUNT(rz.id) > 0) AS has_resume,
  COUNT(rz.id) AS resumes_count,
      (COUNT(a.id) + COALESCE(ext_counts.ext_count, 0)) AS applications_count,
      -- Entrevista inferida por aprovado/rejeitado/final
      BOOL_OR(COALESCE(a.final_approved,false) OR a.status IN ('approved','rejected')) AS has_interview,
      -- final_approved: verdadeiro se tem aprovação interna OU candidatura externa com status hired
      BOOL_OR(COALESCE(a.final_approved,false)) OR COALESCE(ext_hired.is_hired, false) AS final_approved,
      -- Pré-aprovado também verdadeiro quando há aprovado final
      BOOL_OR(COALESCE(a.final_approved,false) OR a.status='approved') OR COALESCE(ext_hired.is_hired, false) AS pre_approved,
      BOOL_OR(a.status='rejected') AS rejected
    FROM students s 
    JOIN users u ON s.user_id=u.id 
    LEFT JOIN courses c ON c.id=s.course_id
    LEFT JOIN school_classes sc ON sc.id=s.class_id
    LEFT JOIN resumes rz ON rz.user_id = s.user_id
    LEFT JOIN applications a ON a.candidate_id = s.user_id
    LEFT JOIN (SELECT student_id, COUNT(*)::int AS ext_count FROM external_applications GROUP BY student_id) ext_counts ON ext_counts.student_id = s.user_id
    LEFT JOIN (SELECT student_id, true AS is_hired FROM external_applications WHERE LOWER(status) IN ('hired','contratado','aprovado','accepted','approved') GROUP BY student_id) ext_hired ON ext_hired.student_id = s.user_id
    WHERE s.class_id=$1 
    GROUP BY s.id, u.id, u.name, u.email, u.phone, u.cpf, u.profile_image, s.status, s.is_featured, s.birth_date, s.gender, c.name, sc.name, ext_counts.ext_count, ext_hired.is_hired
    ORDER BY u.name
  `,[id]);
    res.json({ success:true, students:r.rows });
  } catch(e){ console.error('List class students error',e); res.status(500).json({ success:false, message:'Erro ao listar alunos da turma'}); }
});

// ========== EXPORTAR MODELO PARA EMPRESAS ==========
router.get('/export/company-template', authenticateToken, requireSchool, async (req, res) => {
  try {
    // Buscar alguns alunos para exemplo
    const students = await pool.query(`
      SELECT u.name, u.email, u.phone, u.cpf, c.name as course_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.school_id = $1
      ORDER BY u.name
      LIMIT 50
    `, [req.user.id]);

    const workbook = XLSX.utils.book_new();

    const formatCPF = (cpf) => {
      if(!cpf) return '';
      const digits = cpf.replace(/\D/g,'');
      if(digits.length!==11) return cpf;
      return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
    };
    const formatPhone = (phone) => {
      if(!phone) return '';
      const d = phone.replace(/\D/g,'');
      if(d.length===11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
      if(d.length===10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
      return phone;
    };

    const sample = students.rows.map(s => ({
      'Nome': s.name,
      'Email': s.email,
      'CPF': formatCPF(s.cpf || ''),
      'Telefone': formatPhone(s.phone || ''),
      'Senha': 'Senha@123',
      'Data de Nascimento': '01/01/2000'
    }));
    if(sample.length === 0) sample.push({ 'Nome':'Nome Aluno', 'Email':'aluno@escola.com', 'CPF':'999.999.999-99', 'Telefone':'(99) 99999-9999', 'Senha':'senha', 'Data de Nascimento':'31/12/1930' });

    const sheet = XLSX.utils.json_to_sheet(sample, { header:['Nome','Email','CPF','Telefone','Senha','Data de Nascimento'] });
    XLSX.utils.book_append_sheet(workbook, sheet, 'ModeloEmpresas');

    const buffer = XLSX.write(workbook, { type:'buffer', bookType:'xlsx' });
    const fileName = `modelo_empresas_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (e) {
    console.error('Erro export company template:', e); res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// ========== EXPORTAR MODELO DE ALUNOS (XLSX) ==========
// Gera exatamente o mesmo conteúdo do CSV 'students-import-template.csv' porém em XLSX
router.get('/export/students-template', authenticateToken, requireSchool, async (req, res) => {
  try {
    const workbook = XLSX.utils.book_new();
    const header = ['Nome','Email','CPF','Telefone','Senha','Data de Nascimento'];
    const exampleRow = {
      'Nome':'nome do aluno',
      'Email':'email do aluno',
      'CPF':'CPF do aluno',
      'Telefone':'telefone do aluno',
      'Senha':'RA do aluno',
      'Data de Nascimento':'data de nascimento do aluno'
    };
    const sheet = XLSX.utils.json_to_sheet([exampleRow], { header });
    // Forçar ordem das colunas conforme header
    sheet['!cols'] = header.map(()=>({ wch:22 }));
    XLSX.utils.book_append_sheet(workbook, sheet, 'ModeloAlunos');
    const buffer = XLSX.write(workbook, { type:'buffer', bookType:'xlsx' });
    const fileName = `modelo_alunos_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (e) {
    console.error('Erro export students template:', e); res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// ========== ESTATÍSTICAS ==========

// Dashboard - estatísticas da escola
router.get('/dashboard/stats', authenticateToken, requireSchool, async (req, res) => {
  try {
    // Total de estudantes
    const totalStudents = await pool.query(`
      SELECT COUNT(*) as total FROM students WHERE school_id = $1
    `, [req.user.id]);

    // Estudantes por status
    const studentsByStatus = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM students 
      WHERE school_id = $1 
      GROUP BY status
    `, [req.user.id]);

    // Estudantes por curso
    const studentsByCourse = await pool.query(`
      SELECT c.name, COUNT(s.id) as count
      FROM courses c
      LEFT JOIN students s ON c.id = s.course_id AND s.school_id = $1
      WHERE c.school_id = $1
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `, [req.user.id]);

    // Média geral da escola
    const averageGPA = await pool.query(`
      SELECT AVG(gpa) as average_gpa
      FROM students 
      WHERE school_id = $1 AND gpa IS NOT NULL
    `, [req.user.id]);

    // Alunos sem curso (course_id NULL)
    const studentsWithoutCourses = await pool.query(`
      SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND course_id IS NULL
    `, [req.user.id]);

    // Currículos criados por alunos da escola
    const resumesCreated = await pool.query(`
      SELECT COUNT(r.id) as count
      FROM resumes r
      JOIN students s ON r.user_id = s.user_id
      WHERE s.school_id = $1
    `, [req.user.id]);

    // Alunos sem currículos criados
    const studentsWithoutResumes = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.school_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM resumes r WHERE r.user_id = s.user_id
        )
    `, [req.user.id]);

    // Alunos que não enviaram candidaturas
    const studentsWithoutApplications = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.school_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM applications a WHERE a.candidate_id = s.user_id
        )
    `, [req.user.id]);

    res.json({
      success: true,
      stats: {
        total_students: parseInt(totalStudents.rows[0].total),
        students_by_status: studentsByStatus.rows,
        students_by_course: studentsByCourse.rows,
        average_gpa: averageGPA.rows[0].average_gpa ? 
          parseFloat(averageGPA.rows[0].average_gpa).toFixed(2) : null
  ,
  students_without_courses: parseInt(studentsWithoutCourses.rows[0].count) || 0,
  resumes_created: parseInt(resumesCreated.rows[0].count) || 0,
  students_without_resumes: parseInt(studentsWithoutResumes.rows[0].count) || 0,
  students_without_applications: parseInt(studentsWithoutApplications.rows[0].count) || 0
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ========== EMPREGABILIDADE (TEMPO REAL) ==========
// Métricas de empregabilidade para a escola logada: contratados, entrevistas e currículos enviados
router.get('/dashboard/employability', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;

    // Garantir colunas necessárias na tabela applications (idempotente)
    await pool.query(`
      ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS interview_canceled_by_company BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_rejected_by_candidate BOOLEAN DEFAULT FALSE
    `);

    // Totais básicos
    const [rTotalStudents, rStudentsWithResumes, rStudentsWithApps] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM students WHERE school_id=$1`, [schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT s.user_id)::int AS count
        FROM students s
        JOIN resumes r ON r.user_id = s.user_id
        WHERE s.school_id=$1
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT s.user_id)::int AS count
        FROM students s
        JOIN applications a ON a.candidate_id = s.user_id
        WHERE s.school_id=$1
      `, [schoolId])
    ]);

    const totalStudents = rTotalStudents.rows[0]?.total || 0;
    const studentsWithResumes = rStudentsWithResumes.rows[0]?.count || 0;
    const studentsWithApplications = rStudentsWithApps.rows[0]?.count || 0;

    // Contagens de empregabilidade
    const [rHiredStudents, rInterviews, rInterviewsDistinct, rInterviewsTotal, rInterviewsTotalDistinct, rApplications] = await Promise.all([
      pool.query(`
        SELECT (
          COALESCE((SELECT COUNT(DISTINCT a.candidate_id) FROM applications a JOIN students s ON s.user_id=a.candidate_id WHERE s.school_id=$1 AND COALESCE(a.final_approved,false)=true), 0)
          + COALESCE((SELECT COUNT(DISTINCT ea.student_id) FROM external_applications ea JOIN students s ON s.user_id=ea.student_id WHERE s.school_id=$1 AND LOWER(ea.status) IN ('hired','contratado','aprovado','accepted','approved')), 0)
        )::int AS count
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
          AND COALESCE(a.final_approved,false)=false
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(DISTINCT a.candidate_id)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1
          AND a.interview_date IS NOT NULL
          AND COALESCE(a.interview_canceled_by_company,false)=false
          AND COALESCE(a.interview_rejected_by_candidate,false)=false
      `, [schoolId]),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications a
        JOIN students s ON s.user_id = a.candidate_id
        WHERE s.school_id=$1
      `, [schoolId])
    ]);

  const hiredStudents = rHiredStudents.rows[0]?.count || 0;
  const interviews = rInterviews.rows[0]?.count || 0; // ativas
  const interviewsDistinctStudents = rInterviewsDistinct.rows[0]?.count || 0;
  const interviewsTotal = rInterviewsTotal.rows[0]?.count || 0; // histórico
  const interviewsTotalDistinctStudents = rInterviewsTotalDistinct.rows[0]?.count || 0;
    const applications = rApplications.rows[0]?.count || 0;

    // Por Curso
    const rByCourse = await pool.query(`
      SELECT 
        c.id AS course_id,
        c.name AS course_name,
        COALESCE(COUNT(s.user_id),0)::int AS total_students,
        COALESCE(COUNT(DISTINCT CASE WHEN a.final_approved THEN s.user_id END),0)::int AS hired_students
      FROM courses c
      LEFT JOIN students s ON s.course_id = c.id AND s.school_id=$1
      LEFT JOIN applications a ON a.candidate_id = s.user_id AND a.final_approved = TRUE
      WHERE c.school_id=$1
      GROUP BY c.id, c.name
      ORDER BY hired_students DESC, total_students DESC, c.name ASC
    `, [schoolId]);

    // Por Turma (Classe)
    const rByClass = await pool.query(`
      SELECT 
        sc.id AS class_id,
        sc.name AS class_name,
        COALESCE(COUNT(s.user_id),0)::int AS total_students,
        COALESCE(COUNT(DISTINCT CASE WHEN a.final_approved THEN s.user_id END),0)::int AS hired_students
      FROM school_classes sc
      LEFT JOIN students s ON s.class_id = sc.id AND s.school_id=$1
      LEFT JOIN applications a ON a.candidate_id = s.user_id AND a.final_approved = TRUE
      WHERE sc.school_id=$1
      GROUP BY sc.id, sc.name
      ORDER BY hired_students DESC, total_students DESC, sc.name ASC
    `, [schoolId]);

    const byCourse = rByCourse.rows.map(row => ({
      course_id: row.course_id,
      course_name: row.course_name,
      total_students: row.total_students,
      hired_students: row.hired_students,
      hire_rate_pct: row.total_students > 0 ? Math.round((row.hired_students / row.total_students) * 1000) / 10 : 0
    }));

    const byClass = rByClass.rows.map(row => ({
      class_id: row.class_id,
      class_name: row.class_name,
      total_students: row.total_students,
      hired_students: row.hired_students,
      hire_rate_pct: row.total_students > 0 ? Math.round((row.hired_students / row.total_students) * 1000) / 10 : 0
    }));

    const overallEmployedPctAll = totalStudents > 0 ? Math.round((hiredStudents / totalStudents) * 1000) / 10 : 0;
    const overallEmployedPctApplicants = studentsWithApplications > 0 ? Math.round((hiredStudents / studentsWithApplications) * 1000) / 10 : 0;

    res.json({
      success: true,
      employability: {
        totals: {
          total_students: totalStudents,
          students_with_resumes: studentsWithResumes,
          students_with_applications: studentsWithApplications
        },
        counts: {
          hired_students: hiredStudents,
          interviews_active: interviews,
          interviews_active_distinct_students: interviewsDistinctStudents,
          interviews_total: interviewsTotal,
          interviews_total_distinct_students: interviewsTotalDistinctStudents,
          applications
        },
        rates: {
          overall_employed_pct_all_students: overallEmployedPctAll,
          overall_employed_pct_applicants: overallEmployedPctApplicants
        },
        by_course: byCourse,
        by_class: byClass
      }
    });
  } catch (error) {
    console.error('Erro ao obter empregabilidade:', error);
    res.status(500).json({ success:false, message:'Erro interno do servidor' });
  }
});

// Listar alunos contratados (final), mais recente por aluno
router.get('/employability/hired', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { class_id } = req.query;
    
    // Se class_id for 'featured', filtrar por alunos destacados ao invés de turma
    let extra = '';
    let params = [schoolId];
    if (class_id && class_id !== 'featured') {
      extra = ' AND s.class_id=$2';
      params.push(class_id);
    } else if (class_id === 'featured') {
      extra = ' AND COALESCE(s.is_featured, false) = true';
    }
    
    params.push(limit, offset);
    
    const r = await pool.query(`
      WITH combined_hired AS (
        -- Candidaturas internas com final_approved
        SELECT 
          a.candidate_id AS user_id,
          a.final_approved_at,
          a.job_id,
          j.title AS job_title,
          j.company_id AS company_id,
          COALESCE(cu.name, cu.company_name, 'Empresa') AS company_name,
          'internal' AS source,
          ROW_NUMBER() OVER (PARTITION BY a.candidate_id ORDER BY a.final_approved_at DESC NULLS LAST, a.updated_at DESC) AS rn
        FROM applications a
        JOIN students s ON s.user_id=a.candidate_id
        LEFT JOIN jobs j ON j.id=a.job_id
        LEFT JOIN users cu ON j.company_id=cu.id
        WHERE s.school_id=$1${extra} AND COALESCE(a.final_approved,false)=true
      ), external_hired AS (
        -- Candidaturas externas com status hired/contratado
        SELECT 
          ea.student_id AS user_id,
          ea.applied_at AS final_approved_at,
          NULL::uuid AS job_id,
          ea.job_title,
          NULL::uuid AS company_id,
          COALESCE(ea.company_name, 'Empresa Externa') AS company_name,
          'external' AS source,
          ROW_NUMBER() OVER (PARTITION BY ea.student_id ORDER BY ea.applied_at DESC) AS rn
        FROM external_applications ea
        JOIN students s ON s.user_id=ea.student_id
        WHERE s.school_id=$1${extra} AND LOWER(ea.status) IN ('hired','contratado','aprovado','accepted','approved')
      ), all_hired AS (
        SELECT * FROM combined_hired WHERE rn=1
        UNION ALL
        SELECT * FROM external_hired WHERE rn=1
      ), deduped AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY source ASC) AS final_rn
        FROM all_hired
      )
      SELECT 
        u.id AS user_id,
        u.name, u.email, u.profile_image,
        d.job_id,
        d.job_title,
        d.company_id,
        d.company_name,
        d.final_approved_at,
        d.source
      FROM deduped d
      JOIN users u ON u.id=d.user_id
      WHERE d.final_rn=1
      ORDER BY d.final_approved_at DESC NULLS LAST, u.name ASC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);
    res.json({ success:true, rows: r.rows, pagination: { limit, offset } });
  } catch (e) {
    console.error('Erro GET /schools/employability/hired:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Listar pré-aprovados (candidatos com status approved ou interview confirmada, mas NÃO final_approved)
router.get('/employability/pre-approved', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { class_id } = req.query;
    
    let extra = '';
    let params = [schoolId];
    let paramIndex = 2;
    
    if (class_id && class_id !== 'featured') {
      extra = ` AND s.class_id=$${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    } else if (class_id === 'featured') {
      extra = ' AND COALESCE(s.is_featured, false) = true';
    }
    
    params.push(limit, offset);
    
    const r = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.name, u.email, u.profile_image,
        a.created_at AS applied_at,
        a.status,
        a.decision_at AS pre_approved_at,
        a.job_id AS job_id,
        j.title AS job_title,
        j.location AS job_location,
        j.company_id AS company_id,
        COALESCE(c.name, c.company_name, 'Empresa') AS company_name,
        sc.name AS class_name,
        COALESCE(s.is_featured, false) AS is_featured
      FROM applications a
      JOIN students s ON s.user_id=a.candidate_id
      JOIN users u ON u.id=s.user_id
      LEFT JOIN jobs j ON j.id=a.job_id
      LEFT JOIN users c ON j.company_id=c.id
      LEFT JOIN school_classes sc ON s.class_id=sc.id
      WHERE s.school_id=$1${extra}
        AND (a.status='approved' OR a.interview_confirmed=true)
        AND COALESCE(a.final_approved, false) = false
      ORDER BY a.decision_at DESC NULLS LAST, u.name ASC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);
    res.json({ success:true, rows: r.rows, pagination:{ limit, offset } });
  } catch (e) {
    console.error('Erro GET /schools/employability/pre-approved:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Listar entrevistas (ativas e histórico) para empregabilidade da escola
router.get('/employability/interviews', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const offset = parseInt(req.query.offset) || 0;
    const { class_id } = req.query;

    // Se class_id for 'featured', filtrar por alunos destacados
    let extra = '';
    let params = [schoolId];
    if (class_id && class_id !== 'featured') {
      extra = ' AND s.class_id=$2';
      params.push(class_id);
    } else if (class_id === 'featured') {
      extra = ' AND COALESCE(s.is_featured, false) = true';
    }

    // Garantir colunas usadas
    await pool.query(`
      ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_canceled_by_company BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS interview_rejected_by_candidate BOOLEAN DEFAULT FALSE
    `);

    // Entrevistas ativas (futuras ou em aberto, não canceladas/rejeitadas e não final aprovadas)
    const paramsUpcoming = [...params, limit, offset];
    const upcoming = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.name, u.email, u.profile_image,
        a.id AS application_id,
        a.created_at,
        a.interview_date,
        a.interview_mode,
        a.interview_location,
        a.interview_link,
        a.interview_notes,
        a.interview_confirmed,
        a.job_id AS job_id,
        j.title AS job_title,
        j.company_id AS company_id,
        COALESCE(c.name, c.company_name, 'Empresa') AS company_name
      FROM applications a
      JOIN students s ON s.user_id=a.candidate_id
      JOIN users u ON u.id=s.user_id
      LEFT JOIN jobs j ON j.id=a.job_id
      LEFT JOIN users c ON j.company_id=c.id
      WHERE s.school_id=$1${extra}
        AND a.interview_date IS NOT NULL
        AND COALESCE(a.interview_canceled_by_company,false)=false
        AND COALESCE(a.interview_rejected_by_candidate,false)=false
        AND COALESCE(a.final_approved,false)=false
      ORDER BY a.created_at DESC NULLS LAST, a.interview_date DESC NULLS LAST, u.name ASC
      LIMIT $${paramsUpcoming.length-1} OFFSET $${paramsUpcoming.length}
    `, paramsUpcoming);

    // Histórico de entrevistas (inclui canceladas/rejeitadas/final aprovadas/passadas)
    const paramsHistory = [...params, limit, offset];
    const history = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.name, u.email, u.profile_image,
        a.id AS application_id,
        a.created_at,
        a.interview_date,
        a.interview_mode,
        a.interview_location,
        a.interview_link,
        a.interview_notes,
        a.interview_confirmed,
        a.interview_canceled_by_company,
        a.interview_canceled_at,
        a.interview_cancel_reason,
        a.interview_rejected_by_candidate,
        a.interview_rejected_at,
        a.last_rejected_interview_date,
        a.status,
        a.final_approved,
        a.final_approved_at,
        a.job_id AS job_id,
        j.title AS job_title,
        j.company_id AS company_id,
        COALESCE(c.name, c.company_name, 'Empresa') AS company_name
      FROM applications a
      JOIN students s ON s.user_id=a.candidate_id
      JOIN users u ON u.id=s.user_id
      LEFT JOIN jobs j ON j.id=a.job_id
      LEFT JOIN users c ON j.company_id=c.id
      WHERE s.school_id=$1${extra}
        AND a.interview_date IS NOT NULL
        AND (
          COALESCE(a.interview_canceled_by_company,false)=true OR
          COALESCE(a.interview_rejected_by_candidate,false)=true OR
          COALESCE(a.final_approved,false)=true OR
          a.status='rejected'
        )
      ORDER BY a.created_at DESC NULLS LAST, a.interview_date DESC NULLS LAST, u.name ASC
      LIMIT $${paramsHistory.length-1} OFFSET $${paramsHistory.length}
    `, paramsHistory);

    // Para compatibilidade com código antigo, também expor rows = upcoming
    res.json({
      success:true,
      upcoming: upcoming.rows,
      history: history.rows,
      rows: upcoming.rows,
      pagination:{ limit, offset }
    });
  } catch (e) {
    console.error('Erro GET /schools/employability/interviews:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Listar candidaturas (enviadas) dos alunos da escola
router.get('/employability/applications', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { class_id, job_id } = req.query;
    
    // Se class_id for 'featured', filtrar por alunos destacados
    let extra = '';
    let params = [schoolId];
    let paramIndex = 2;
    
    if (class_id && class_id !== 'featured') {
      extra = ` AND s.class_id=$${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    } else if (class_id === 'featured') {
      extra = ' AND COALESCE(s.is_featured, false) = true';
    }
    
    // Filtrar por vaga específica
    if (job_id) {
      extra += ` AND a.job_id=$${paramIndex}`;
      params.push(job_id);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const r = await pool.query(`
      SELECT * FROM (
        SELECT 
          u.id AS user_id,
          u.name, u.email, u.profile_image,
          a.created_at AS applied_at,
          a.status,
          a.decision_at AS decision_at,
          a.final_approved_at AS final_approved_at,
          a.final_approved AS final_approved,
          a.job_id AS job_id,
          j.title AS job_title,
          j.location AS job_location,
          j.company_id AS company_id,
          COALESCE(c.name, c.company_name, 'Empresa') AS company_name,
          c.profile_image AS company_avatar,
          sc.name AS class_name,
          COALESCE(s.is_featured, false) AS is_featured,
          'internal' AS source
        FROM applications a
        JOIN students s ON s.user_id=a.candidate_id
        JOIN users u ON u.id=s.user_id
        LEFT JOIN jobs j ON j.id=a.job_id
        LEFT JOIN users c ON j.company_id=c.id
        LEFT JOIN school_classes sc ON s.class_id=sc.id
        WHERE s.school_id=$1${extra}
        UNION ALL
        SELECT 
          u.id AS user_id,
          u.name, u.email, u.profile_image,
          ea.applied_at AS applied_at,
          ea.status,
          NULL AS decision_at,
          NULL AS final_approved_at,
          CASE WHEN LOWER(ea.status) IN ('aprovado','contratado','hired','approved') THEN true ELSE false END AS final_approved,
          NULL AS job_id,
          ea.job_title AS job_title,
          NULL AS job_location,
          NULL AS company_id,
          COALESCE(ea.company_name, 'Empresa Externa') AS company_name,
          NULL AS company_avatar,
          sc.name AS class_name,
          COALESCE(s.is_featured, false) AS is_featured,
          'external' AS source
        FROM external_applications ea
        JOIN students s ON s.user_id=ea.student_id
        JOIN users u ON u.id=s.user_id
        LEFT JOIN school_classes sc ON s.class_id=sc.id
        WHERE s.school_id=$1${extra}
      ) combined
      ORDER BY applied_at DESC NULLS LAST, name ASC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);
    res.json({ success:true, rows: r.rows, pagination:{ limit, offset } });
  } catch (e) {
    console.error('Erro GET /schools/employability/applications:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});


// ========== LICENÇAS DA ESCOLA ==========
// Retorna limites e uso atual (alunos totais e destacados) para a própria escola
router.get('/licenses', authenticateToken, requireSchool, async (req, res) => {
  try {
    // Garantir colunas
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS students_limit INTEGER`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_students_limit INTEGER`);

    const schoolId = req.user.id;

    const rUser = await pool.query(
      `SELECT students_limit, featured_students_limit FROM users WHERE id=$1 AND type='school' LIMIT 1`,
      [schoolId]
    );
    if (rUser.rows.length === 0) {
      return res.status(404).json({ success:false, message:'Escola não encontrada' });
    }

    const rCounts = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE school_id=$1) AS students_count,
         (SELECT COUNT(*) FROM students WHERE school_id=$1 AND is_featured=true) AS featured_count`,
      [schoolId]
    );

    const studentsLimit = rUser.rows[0].students_limit;
    const featuredLimit = rUser.rows[0].featured_students_limit;
    const studentsUsed = parseInt(rCounts.rows[0].students_count) || 0;
    const featuredUsed = parseInt(rCounts.rows[0].featured_count) || 0;

    res.json({
      success: true,
      licenses: {
        students: {
          limit: studentsLimit,
          used: studentsUsed,
          available: Number.isInteger(studentsLimit) ? Math.max(0, studentsLimit - studentsUsed) : null
        },
        featured: {
          limit: featuredLimit,
          used: featuredUsed,
          available: Number.isInteger(featuredLimit) ? Math.max(0, featuredLimit - featuredUsed) : null
        }
      }
    });
  } catch (e) {
    console.error('Erro GET /schools/licenses:', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// ========= PERFIL DA ESCOLA =========
// Obter informações da escola
router.get('/profile', authenticateToken, requireSchool, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, email, school_name, school_type, school_director, school_contact_phone, school_city, school_state, school_website
      FROM users WHERE id = $1 AND type = 'school'
    `, [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ success:false, message:'Escola não encontrada' });
    res.json({ success:true, school: r.rows[0] });
  } catch (error) {
    console.error('Erro ao obter perfil da escola:', error);
    res.status(500).json({ success:false, message:'Erro interno do servidor' });
  }
});

// Atualizar informações básicas da escola
console.log('🔧 Registrando rota PUT /api/schools/profile');
router.put('/profile', authenticateToken, requireSchool, async (req, res) => {
  try {
    const {
      school_name,
      school_type,
      school_director,
      school_contact_phone,
      school_city,
      school_state,
      school_website
    } = req.body;

    // Atualizar apenas campos permitidos
    const result = await pool.query(`
      UPDATE users SET 
        school_name = COALESCE($1, school_name),
        school_type = COALESCE($2, school_type),
        school_director = COALESCE($3, school_director),
        school_contact_phone = COALESCE($4, school_contact_phone),
        school_city = COALESCE($5, school_city),
        school_state = COALESCE($6, school_state),
        school_website = COALESCE($7, school_website),
        updated_at = NOW()
      WHERE id = $8 AND type = 'school'
      RETURNING id, email, type, school_name, school_type, school_director, school_contact_phone, school_city, school_state, school_website
    `, [
      school_name,
      school_type,
      school_director,
      school_contact_phone,
      school_city,
      school_state,
      school_website,
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escola não encontrada' });
    }

    res.json({ success: true, school: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar perfil da escola:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ========== PARCERIAS ==========

// Solicitar parceria com empresa
router.post('/partnerships/request/:companyId', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { companyId } = req.params;

    // Verificar se empresa existe
    const companyCheck = await pool.query(
      `SELECT id, name, company_name, type FROM users WHERE id=$1 AND type='company'`,
      [companyId]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
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
      
      // Se está pendente e foi solicitada pela empresa, aceitar automaticamente
      if (partnership.status === 'pending' && partnership.requested_by === 'company') {
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
         VALUES ($1, $2, 'pending', 'school')`,
        [schoolId, companyId]
      );
    } catch (insertErr) {
      console.warn('Inserção com requested_by falhou (school), tentando fallback sem essa coluna:', insertErr.message);
      if (/requested_by|column .* does not exist|42703/.test(String(insertErr.message))) {
        try {
          await pool.query(
            `INSERT INTO partnerships (school_id, company_id, status) VALUES ($1, $2, 'pending')`,
            [schoolId, companyId]
          );
        } catch (fallbackErr) {
          console.error('Fallback de inserção também falhou (school):', fallbackErr);
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

// Listar parcerias da escola
router.get('/partnerships', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { status } = req.query; // pending, accepted
    
    console.log('[Partnerships] School ID:', schoolId, 'Status filter:', status);
    
    let query = `
      SELECT 
        p.*,
        u.id as company_id,
        u.name,
        u.company_name,
        u.email,
        u.cnpj,
        u.profile_image as avatar_url
      FROM partnerships p
      JOIN users u ON u.id = p.company_id
      WHERE p.school_id = $1
    `;
    
    const params = [schoolId];
    
    if (status) {
      query += ` AND p.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    console.log('[Partnerships] Found:', result.rows.length, 'partnerships');
    
    res.json({ success: true, partnerships: result.rows });
  } catch (error) {
    console.error('Erro ao listar parcerias:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// Aceitar solicitação de parceria
router.post('/partnerships/accept/:partnershipId', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { partnershipId } = req.params;

    const result = await pool.query(
      `UPDATE partnerships 
       SET status='accepted'
       WHERE id=$1 AND school_id=$2 AND status='pending'
       RETURNING *`,
      [partnershipId, schoolId]
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
router.delete('/partnerships/:partnershipId', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { partnershipId } = req.params;

    const result = await pool.query(
      `DELETE FROM partnerships WHERE id=$1 AND school_id=$2 RETURNING *`,
      [partnershipId, schoolId]
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

// Verificar status de parceria com uma empresa específica
router.get('/partnerships/status/:companyId', authenticateToken, requireSchool, async (req, res) => {
  try {
    const schoolId = req.user.id;
    const { companyId } = req.params;

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

// ========== ROTA PARA CANDIDATOS - Buscar empresas parceiras da escola do aluno ==========
router.get('/partnerships/my-school', authenticateToken, async (req, res) => {
  try {
    // Só permite candidatos
    if (req.user.type !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    
    // Buscar school_id do aluno na tabela students
    const studentResult = await pool.query(
      'SELECT school_id FROM students WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );
    
    if (studentResult.rows.length === 0 || !studentResult.rows[0].school_id) {
      // Aluno não vinculado a nenhuma escola
      return res.json({ success: true, partnerships: [], partnerCompanyIds: [] });
    }
    
    const schoolId = studentResult.rows[0].school_id;
    
    // Buscar parcerias aceitas da escola do aluno
    try {
      const result = await pool.query(`
        SELECT 
          p.id,
          p.company_id,
          p.status,
          p.created_at,
          u.company_name,
          u.email,
          u.profile_image as avatar_url
        FROM partnerships p
        JOIN users u ON u.id = p.company_id
        WHERE p.school_id = $1 AND p.status = 'accepted'
        ORDER BY u.company_name
      `, [schoolId]);
      
      const partnerCompanyIds = result.rows.map(p => String(p.company_id));
      
      console.log('[Partnerships/my-school] Student:', req.user.id, 'School:', schoolId, 'Partners:', partnerCompanyIds.length);
      
      res.json({ 
        success: true, 
        partnerships: result.rows,
        partnerCompanyIds 
      });
    } catch (tableError) {
      // Se tabela partnerships não existe, retorna array vazio
      if (tableError.message.includes('partnerships') || tableError.message.includes('does not exist')) {
        console.log('[Partnerships/my-school] Tabela partnerships não existe - retornando array vazio');
        return res.json({ 
          success: true, 
          partnerships: [],
          partnerCompanyIds: [],
          message: 'Tabela de parcerias ainda não foi criada'
        });
      }
      throw tableError;
    }
  } catch (error) {
    console.error('Erro ao buscar parcerias da escola do aluno:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

export default router;
