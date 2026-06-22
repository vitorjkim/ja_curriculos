import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateUserRegistration, validateUserUpdate } from '../middleware/validation.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ===================== LAZY MIGRATION: is_agency =====================
let ensuredAgencyColumn = false;
const ensureAgencyColumn = async () => {
  if (ensuredAgencyColumn) return;
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_agency BOOLEAN DEFAULT FALSE');
    ensuredAgencyColumn = true;
  } catch (e) {
    console.error('Erro garantindo coluna is_agency:', e.message);
  }
};

// ===================== ESCOLAS (VISUALIZAÇÃO POR EMPRESAS) =====================
// GET /api/users/schools/public - listar escolas para empresas (nome, cidade, total alunos ativos)
router.get('/schools/public', authenticateToken, async (req, res) => {
  try {
    // Apenas empresas ou admins podem ver lista pública de escolas
    if(!(req.user.type==='admin' || (req.user.type==='company'))) return res.status(403).json({ error:'Acesso negado' });
    // Plano premium para todas empresas - verificação removida
    const q = await pool.query(`
      SELECT 
        u.id, 
        u.school_name, 
        u.school_city, 
        u.school_state, 
        u.school_type,
        u.profile_image,
        COALESCE(stats.active_students,0) as active_students
      FROM users u
      LEFT JOIN (
        SELECT school_id, COUNT(*) FILTER (WHERE s.status IS NULL OR LOWER(s.status)='active') as active_students
        FROM students s GROUP BY school_id
      ) stats ON stats.school_id = u.id
      WHERE u.type='school' AND (u.disabled = FALSE OR u.disabled IS NULL)
      ORDER BY u.school_name ASC
    `);
    res.json({ schools: q.rows });
  } catch(err){ console.error('Erro list schools public',err); res.status(500).json({ error:'Erro interno'}); }
});

// GET /api/users/schools/:id/public - detalhes da escola + info agregada para empresas
// Inclui: dados básicos da escola, alunos destacados (is_featured) e sumário de turmas
router.get('/schools/:id/public', authenticateToken, async (req, res) => {
  try {
    if(!(req.user.type==='admin' || (req.user.type==='company'))) return res.status(403).json({ error:'Acesso negado' });
    // Plano premium para todas empresas - verificação removida
    const { id } = req.params;
    const schoolQ = await pool.query(`
      SELECT id, email, school_name, school_type, school_city, school_state, school_director, school_contact_phone, school_website, profile_image
      FROM users WHERE id=$1 AND type='school' AND (disabled=FALSE OR disabled IS NULL)
      LIMIT 1
    `,[id]);
    if(schoolQ.rows.length===0) return res.status(404).json({ error:'Escola não encontrada' });
    // Alunos destacados (is_featured = true)
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    const featuredQ = await pool.query(`
      SELECT u.id as user_id, u.name, u.email, u.phone, u.profile_image, 
             sc.name as class_name, sc.year, sc.shift,
             s.birth_date, s.status,
             COUNT(DISTINCT r.id) as resumes_count,
             COUNT(DISTINCT a.id) as applications_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN school_classes sc ON sc.id = s.class_id
      LEFT JOIN resumes r ON r.user_id = u.id
      LEFT JOIN applications a ON a.candidate_id = u.id
      WHERE s.school_id = $1 AND COALESCE(s.is_featured,false)=true
      GROUP BY u.id, u.name, u.email, u.phone, u.profile_image, sc.name, sc.year, sc.shift, s.birth_date, s.status
      ORDER BY u.name ASC
      LIMIT 100
    `,[id]);
    // Turmas (sumário)
    await pool.query(`CREATE TABLE IF NOT EXISTS school_classes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, name VARCHAR(120) NOT NULL, description TEXT, year INTEGER, shift VARCHAR(30), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
    const classesQ = await pool.query(`
      SELECT sc.id, sc.name, sc.year, sc.shift, COUNT(s.id) FILTER (WHERE s.id IS NOT NULL) as students_count,
             COUNT(s.id) FILTER (WHERE COALESCE(s.is_featured,false)=true) as featured_count
      FROM school_classes sc
      LEFT JOIN students s ON s.class_id = sc.id
      WHERE sc.school_id = $1
      GROUP BY sc.id
      ORDER BY sc.name ASC
    `,[id]);
    res.json({ school: schoolQ.rows[0], featured: featuredQ.rows, classes: classesQ.rows });
  } catch(err){ console.error('Erro school public detail',err); res.status(500).json({ error:'Erro interno'}); }
});

// GET /api/users/classes/:id/public - detalhes da turma e lista de alunos (visão empresas)
router.get('/classes/:id/public', authenticateToken, async (req, res) => {
  try {
    if(!(req.user.type==='admin' || (req.user.type==='company'))) return res.status(403).json({ error:'Acesso negado' });
    // Plano premium para todas empresas - verificação removida
    const { id } = req.params;
    // Garantir tabela de turmas
    await pool.query(`CREATE TABLE IF NOT EXISTS school_classes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      year INTEGER,
      shift VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
    // Garantir colunas extras na tabela students
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS semester INTEGER`);
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS shift VARCHAR(30)`);
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`);
    // Buscar turma com imagem da escola
    const clsQ = await pool.query(`
      SELECT sc.id, sc.name, sc.year, sc.shift, sc.school_id, u.school_name, u.profile_image as school_profile_image
      FROM school_classes sc
      JOIN users u ON u.id = sc.school_id
      WHERE sc.id = $1
      LIMIT 1
    `,[id]);
    if(clsQ.rows.length===0) return res.status(404).json({ error:'Turma não encontrada' });
    // Listar alunos da turma com foto, status e dados extras
    const studentsQ = await pool.query(`
      SELECT u.id as user_id, u.name, u.email, u.profile_image,
             s.status, s.is_featured, s.birth_date, s.semester, s.shift as student_shift
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.class_id = $1
      ORDER BY COALESCE(s.is_featured, false) DESC, u.name ASC
      LIMIT 500
    `,[id]);
    res.json({
      class: clsQ.rows[0],
      students: studentsQ.rows,
      stats: { total: studentsQ.rows.length }
    });
  } catch(err){
    console.error('Erro class public detail', err);
    res.status(500).json({ error:'Erro interno' });
  }
});

// GET /api/users/me/school - dados da escola do candidato (se aluno)
router.get('/me/school', authenticateToken, async (req, res) => {
  try {
    // Apenas candidatos têm vínculo aluno->escola
    if (req.user.type !== 'candidate') {
      return res.json({ school: null });
    }
    const q = await pool.query(`
      SELECT u.school_name, u.school_type, u.school_city, u.school_state, u.school_director, u.school_contact_phone, u.school_website, u.id as school_id
      FROM students s
      JOIN users u ON s.school_id = u.id
      WHERE s.user_id = $1
      LIMIT 1
    `, [req.user.id]);
    if (q.rows.length === 0) return res.json({ school: null });
    res.json({ school: q.rows[0] });
  } catch (error) {
    console.error('Erro ao obter escola do aluno:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/users/me/class-filters - filtros iniciais da turma do candidato
router.get('/me/class-filters', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'candidate') return res.json({ filters: null });
    // obter class_id do estudante
    const stu = await pool.query('SELECT class_id FROM students WHERE user_id=$1 LIMIT 1',[req.user.id]);
    if (stu.rows.length===0 || !stu.rows[0].class_id) return res.json({ filters: null });
    // garantir colunas
    await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_area VARCHAR(100)`);
    await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_subarea VARCHAR(100)`);
    await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_location VARCHAR(120)`);
    await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_work_type VARCHAR(30)`);
    await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_contract_type VARCHAR(30)`);
    await pool.query(`ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS job_experience_level VARCHAR(30)`);
    const cls = await pool.query(`SELECT job_area, job_subarea, job_location, job_work_type, job_contract_type, job_experience_level FROM school_classes WHERE id=$1 LIMIT 1`,[stu.rows[0].class_id]);
    if (cls.rows.length===0) return res.json({ filters: null });
    res.json({ filters: cls.rows[0] });
  } catch (e) {
    console.error('Erro class-filters:', e);
    res.status(500).json({ error:'Erro interno'});
  }
});

// GET /api/users/schools/list - Listar escolas públicas (sem autenticação)
router.get('/schools/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        school_name, 
        school_city, 
        school_state, 
        school_type,
        profile_image
      FROM users 
      WHERE type = 'school' AND (disabled = false OR disabled IS NULL)
      ORDER BY school_name ASC
      LIMIT 20
    `);
    res.json({ schools: result.rows });
  } catch (e) {
    console.error('Erro listando escolas:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users - Listar usuários (apenas admins)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await ensureAgencyColumn();
    const { page = 1, limit = 50, type, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, name, company_name, phone, cpf, cnpj, type, 
             is_admin, disabled, bio, profile_image, created_at, updated_at,
             school_name, school_type, school_city, school_state, is_agency
      FROM users
    `;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Filtro por tipo
    if (type && ['candidate', 'company', 'admin', 'school'].includes(type)) {
      paramCount++;
      whereConditions.push(`type = $${paramCount}`);
      queryParams.push(type);
    }

    // Filtro por status
    if (status) {
      paramCount++;
      if (status === 'active') {
        whereConditions.push(`disabled = $${paramCount}`);
        queryParams.push(false);
      } else if (status === 'disabled') {
        whereConditions.push(`disabled = $${paramCount}`);
        queryParams.push(true);
      }
    }

    // Busca por nome/email
    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(name) LIKE LOWER($${paramCount}) OR 
        LOWER(company_name) LIKE LOWER($${paramCount}) OR 
        LOWER(email) LIKE LOWER($${paramCount})
      )`);
      queryParams.push(`%${search}%`);
    }

    // Aplicar filtros
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Contar total de registros
    let countQuery = 'SELECT COUNT(*) FROM users';
    let countParams = [];

    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
      countParams = queryParams.slice(0, -2); // Remove limit e offset
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);

    // Estatísticas
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'candidate') as candidates,
        COUNT(*) FILTER (WHERE type = 'company') as companies,
        COUNT(*) FILTER (WHERE type = 'school') as schools,
        COUNT(*) FILTER (WHERE type = 'admin') as admins,
        COUNT(*) FILTER (WHERE disabled = false) as active,
        COUNT(*) FILTER (WHERE disabled = true) as disabled
      FROM users
    `);

    const stats = statsResult.rows[0];

    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        schoolName: user.school_name,
        schoolType: user.school_type,
        schoolCity: user.school_city,
        schoolState: user.school_state,
        phone: user.phone,
        cpf: user.cpf,
        cnpj: user.cnpj,
        type: user.type,
        isAdmin: user.is_admin,
        isAgency: user.is_agency || false,
        disabled: user.disabled,
        bio: user.bio,
        profileImage: user.profile_image,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      },
      stats: {
        totalUsers: parseInt(stats.total),
        candidates: parseInt(stats.candidates),
        companies: parseInt(stats.companies),
        schools: parseInt(stats.schools),
        admins: parseInt(stats.admins),
        activeUsers: parseInt(stats.active),
        disabledUsers: parseInt(stats.disabled)
      }
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// ===================== LICENÇAS DE ESCOLAS (ADMIN) =====================
// GET /api/users/:id/licenses - Ver limites e uso atual da escola
router.get('/:id/licenses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Garantir colunas
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS students_limit INTEGER`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_students_limit INTEGER`);

    // Verificar se é escola
    const u = await pool.query('SELECT id, type, school_name, students_limit, featured_students_limit FROM users WHERE id=$1 LIMIT 1',[id]);
    if (u.rows.length===0) return res.status(404).json({ error:'Usuário não encontrado' });
    if (u.rows[0].type !== 'school') return res.status(400).json({ error:'Somente escolas possuem licenças' });

    const usage = await pool.query(`
      SELECT 
        COUNT(*)::int as students_count,
        COUNT(*) FILTER (WHERE COALESCE(is_featured,false)=true)::int as featured_count
      FROM students WHERE school_id=$1
    `,[id]);

    res.json({
      schoolId: id,
      schoolName: u.rows[0].school_name,
      studentsLimit: u.rows[0].students_limit,
      featuredStudentsLimit: u.rows[0].featured_students_limit,
      studentsCount: usage.rows[0].students_count,
      featuredCount: usage.rows[0].featured_count
    });
  } catch (e) {
    console.error('Erro GET /users/:id/licenses', e);
    res.status(500).json({ error:'Erro interno' });
  }
});

// PATCH /api/users/:id/licenses - Definir limites de alunos e destacados para a escola
router.patch('/:id/licenses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { studentsLimit, featuredStudentsLimit } = req.body || {};
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS students_limit INTEGER`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_students_limit INTEGER`);
    const check = await pool.query('SELECT id, type FROM users WHERE id=$1 LIMIT 1',[id]);
    if (check.rows.length===0) return res.status(404).json({ error:'Usuário não encontrado' });
    if (check.rows[0].type !== 'school') return res.status(400).json({ error:'Somente escolas podem receber limites' });

    const r = await pool.query(`
      UPDATE users SET 
        students_limit = COALESCE($1, students_limit),
        featured_students_limit = COALESCE($2, featured_students_limit),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, school_name, students_limit, featured_students_limit
    `,[
      Number.isInteger(studentsLimit) ? studentsLimit : null,
      Number.isInteger(featuredStudentsLimit) ? featuredStudentsLimit : null,
      id
    ]);
    res.json({
      schoolId: r.rows[0].id,
      schoolName: r.rows[0].school_name,
      studentsLimit: r.rows[0].students_limit,
      featuredStudentsLimit: r.rows[0].featured_students_limit
    });
  } catch (e) {
    console.error('Erro PATCH /users/:id/licenses', e);
    res.status(500).json({ error:'Erro interno' });
  }
});

// GET /api/users/company/:id - Obter empresa específica (público)
router.get('/company/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🏢 [DEBUG] GET /api/users/company/:id - ID:', id);
    
    // Garantir colunas novas (idempotente)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_sector VARCHAR(120)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)`);
    const result = await pool.query(`
      SELECT id, email, company_name, phone, cnpj, bio, location, created_at, subscription_plan, subscription_status,
             company_sector, company_size, profile_image
      FROM users 
      WHERE id = $1 AND type = 'company' AND disabled = FALSE
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa não encontrada',
        code: 'COMPANY_NOT_FOUND'
      });
    }

  // Expor o campo de imagem de perfil para consumo público no perfil da empresa
  res.json({ company: result.rows[0] });

  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/users/:id - Obter usuário específico
router.get('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    // Verificar permissões: admin, owner, escola vinculada ou empresa (para ver candidatos)
    const isAdmin = req.user.type === 'admin' || req.user.is_admin;
    const isOwner = req.user.id === id;
    let isCompanyAuthorized = false;
    if (req.user.type === 'company') {
      // Todas empresas podem ver candidatos - plano premium para todas
      const targetTypeQ = await client.query('SELECT type FROM users WHERE id=$1 LIMIT 1',[id]);
      if (targetTypeQ.rows.length && targetTypeQ.rows[0].type === 'candidate') {
        isCompanyAuthorized = true;
      }
    }

    // Checar vínculo escola->aluno
    let isSchoolAuthorized = false;
    if (req.user.type === 'school') {
      const schoolCheck = await client.query(
        'SELECT 1 FROM students WHERE user_id = $1 AND school_id = $2 LIMIT 1',
        [id, req.user.id]
      );
      if (schoolCheck.rows.length > 0) isSchoolAuthorized = true;
    }

  if (!isAdmin && !isOwner && !isSchoolAuthorized && !isCompanyAuthorized) {
      return res.status(403).json({
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    // Buscar usuário
  const result = await pool.query(`
      SELECT id, email, name, company_name, phone, cpf, cnpj, type, 
             is_admin, disabled, bio, location, profile_image, created_at, updated_at,
             school_name, school_type, school_city, school_state,
             linkedin_url, instagram_url, github_url, custom_url, life_status, resume_sections
      FROM users WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    let user = result.rows[0];
    // Sanitizar CPF para empresas (não admins / não owner / não escola)
    if (isCompanyAuthorized && !isAdmin && !isSchoolAuthorized && !isOwner) {
      const maskCpf = (v) => {
        if(!v) return null;
        const digits = v.replace(/\D/g,'');
        if(digits.length !== 11) return null; // se formato inesperado, não expor
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.***-$4');
      };
      user = { ...user, cpf: maskCpf(user.cpf) };
    }

    // Trazer dados de estudante (para escola autorizada ou o próprio candidato)
    let student = null;
    if (isSchoolAuthorized) {
      const s = await client.query(`
        SELECT s.id, s.user_id, s.course_id, s.student_registration, s.current_semester, s.total_semesters,
               s.gpa, s.status, s.emergency_contact_name, s.emergency_contact_phone, s.birth_date, s.gender, s.notes,
               s.class_id, sc.name as class_name, s.school_id, s.is_featured,
               u.profile_image as school_avatar, u.school_name as school_name_from_users
        FROM students s
        LEFT JOIN school_classes sc ON sc.id = s.class_id
        LEFT JOIN users u ON u.id = s.school_id
        WHERE s.user_id = $1 AND s.school_id = $2 LIMIT 1
      `, [id, req.user.id]);
      if (s.rows.length > 0) student = s.rows[0];
    } else if ((isOwner || isCompanyAuthorized) && user.type === 'candidate') {
      const s = await client.query(`
        SELECT s.id, s.user_id, s.course_id, s.student_registration, s.current_semester, s.total_semesters,
               s.gpa, s.status, s.emergency_contact_name, s.emergency_contact_phone, s.birth_date, s.gender, s.notes,
               s.class_id, sc.name as class_name, s.school_id, s.is_featured,
               u.profile_image as school_avatar, u.school_name
        FROM students s
        LEFT JOIN school_classes sc ON sc.id = s.class_id
        LEFT JOIN users u ON u.id = s.school_id
        WHERE s.user_id = $1
        LIMIT 1
      `,[id]);
      if (s.rows.length > 0) student = s.rows[0];
      // Para empresas, remover campos sensíveis adicionais
      if (isCompanyAuthorized) {
        if (student) {
          student = { ...student, emergency_contact_name: null, emergency_contact_phone: null, notes: null, gpa: student.gpa, student_registration: null };
        }
      }
    }

    res.json({
  user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        schoolName: user.school_name,
        schoolType: user.school_type,
        schoolCity: user.school_city,
        schoolState: user.school_state,
        phone: user.phone,
        cpf: user.cpf,
        cnpj: user.cnpj,
        type: user.type,
        isAdmin: user.is_admin,
        disabled: user.disabled,
        bio: user.bio,
        location: user.location,
        profileImage: user.profile_image,
        linkedin_url: user.linkedin_url,
        instagram_url: user.instagram_url,
        github_url: user.github_url,
        custom_url: user.custom_url,
        life_status: user.life_status,
        resume_sections: user.resume_sections || {},
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      student // pode ser null
    });

  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', authenticateToken, validateUserUpdate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      email,
      name,
      companyName,
      phone,
      cpf,
      cnpj,
      type,
      bio,
      location,
      password,
      companySector,
      companySize,
      linkedinUrl,
      instagramUrl,
      githubUrl,
      customUrl,
      lifeStatus,
      isAgency,
      schoolName,
      schoolType,
      schoolCity,
      resumeSections
    } = req.body;

    console.log('🔍 PUT /api/users/:id - Dados recebidos:', {
      id,
      email,
      name,
      companyName,
      phone,
      bio,
      location,
      type,
      isAgency
    });

    // Verificar permissões: admin, owner ou escola vinculada ao aluno
    const isAdmin = req.user.type === 'admin' || req.user.is_admin;
    const isOwner = req.user.id === id;

    // Checar vínculo escola->aluno (se quem está editando for escola)
    let isSchoolAuthorized = false;
    let studentRow = null;
    if (req.user.type === 'school') {
      const s = await client.query('SELECT id, user_id FROM students WHERE user_id = $1 AND school_id = $2 LIMIT 1', [id, req.user.id]);
      if (s.rows.length > 0) {
        isSchoolAuthorized = true;
        studentRow = s.rows[0];
      }
    }

    if (!isAdmin && !isOwner && !isSchoolAuthorized) {
      return res.status(403).json({
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    // Verificar se usuário existe
    const existingUser = await client.query(
      'SELECT id, email, type FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se email já está em uso por outro usuário
    if (email && email !== existingUser.rows[0].email) {
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Este email já está sendo usado',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }
    }

    // Verificar se CNPJ já está em uso por outra empresa
    if (cnpj && existingUser.rows[0].type === 'company') {
      const cnpjCheck = await client.query(
        'SELECT id FROM users WHERE cnpj = $1 AND id != $2 AND type = $3',
        [cnpj, id, 'company']
      );

      if (cnpjCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Este CNPJ já está cadastrado por outra empresa',
          code: 'CNPJ_ALREADY_EXISTS'
        });
      }
    }

    // Apenas admins podem alterar o tipo de usuário
    if (type && type !== existingUser.rows[0].type && !isAdmin) {
      return res.status(403).json({
        error: 'Apenas administradores podem alterar tipo de usuário',
        code: 'TYPE_CHANGE_FORBIDDEN'
      });
    }

    // Construir query de update dinamicamente
    let updateFields = [];
    let updateValues = [];
    let paramCount = 0;

    const addField = (field, value) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push(value);
      }
    };

    // Se for escola autorizada, limitar campos que a escola pode alterar nos dados do usuário
    if (isSchoolAuthorized && !isAdmin && !isOwner) {
      // Escolas só podem atualizar campos básicos de contato/identificação do aluno
      addField('name', name);
      addField('phone', phone);
      addField('cpf', cpf);
    } else {
      // Outros editores (admin ou owner) podem alterar todos os campos permitidos
      addField('email', email);
      addField('name', (existingUser.rows[0].type === 'candidate' || existingUser.rows[0].type === 'admin') ? name : null);
      addField('company_name', existingUser.rows[0].type === 'company' ? companyName : null);
      addField('phone', phone);
      addField('cpf', existingUser.rows[0].type === 'candidate' ? cpf : null);
      addField('cnpj', existingUser.rows[0].type === 'company' ? cnpj : null);
      addField('bio', bio);
      addField('location', location);
      // Campos de empresa adicionais
      addField('company_sector', existingUser.rows[0].type === 'company' ? companySector : null);
      addField('company_size', existingUser.rows[0].type === 'company' ? companySize : null);
      // Campo de agência (somente admin pode alterar)
      if (isAdmin && existingUser.rows[0].type === 'company' && isAgency !== undefined) {
        await ensureAgencyColumn();
        addField('is_agency', isAgency);
      }
      // Campos de redes sociais (apenas para candidatos)
      if (existingUser.rows[0].type === 'candidate') {
        console.log('📱 Redes sociais recebidas:', { linkedinUrl, instagramUrl, githubUrl, customUrl });
        if (linkedinUrl !== undefined) addField('linkedin_url', linkedinUrl);
        if (instagramUrl !== undefined) addField('instagram_url', instagramUrl);
        if (githubUrl !== undefined) addField('github_url', githubUrl);
        if (customUrl !== undefined) addField('custom_url', customUrl);
        if (lifeStatus !== undefined) addField('life_status', lifeStatus);
        if (resumeSections !== undefined) {
          await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_sections JSONB`);
          addField('resume_sections', JSON.stringify(resumeSections));
        }
      }
      // Campos de escola (admin pode alterar)
      if (isAdmin && existingUser.rows[0].type === 'school') {
        if (schoolName !== undefined) addField('school_name', schoolName);
        if (schoolType !== undefined) addField('school_type', schoolType);
        if (schoolCity !== undefined) addField('school_city', schoolCity);
      }
    }

    if (isAdmin && type) {
      addField('type', type);
      addField('is_admin', type === 'admin');
    }

    // Hash da nova senha se fornecida
    if (password && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      addField('password', passwordHash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo para atualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    updateFields.push('updated_at = NOW()');
    paramCount++;
    updateValues.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
  RETURNING id, email, name, company_name, phone, cpf, cnpj, type, 
        is_admin, disabled, bio, location, profile_image, updated_at,
        company_sector, company_size, linkedin_url, instagram_url, github_url, custom_url, life_status, resume_sections
    `;

    const result = await client.query(updateQuery, updateValues);
    const updatedUser = result.rows[0];

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      'USER_UPDATED',
      'user',
      id,
      JSON.stringify({ updatedFields: updateFields }),
      req.ip
    ]);

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        companyName: updatedUser.company_name,
        phone: updatedUser.phone,
        cpf: updatedUser.cpf,
        cnpj: updatedUser.cnpj,
        type: updatedUser.type,
        isAdmin: updatedUser.is_admin,
        disabled: updatedUser.disabled,
        bio: updatedUser.bio,
        location: updatedUser.location,
        profileImage: updatedUser.profile_image,
        companySector: updatedUser.company_sector,
        companySize: updatedUser.company_size,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// PATCH /api/users/:id/toggle-status - Habilitar/desabilitar usuário (apenas admins)
router.patch('/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { disabled } = req.body;

    // Não permitir desabilitar a própria conta
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Você não pode desabilitar sua própria conta',
        code: 'CANNOT_DISABLE_SELF'
      });
    }

    const result = await client.query(`
      UPDATE users 
      SET disabled = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, name, company_name, type, disabled
    `, [disabled, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

  const user = result.rows[0];

    // Se for candidato vinculado a students, sincronizar status (active/inactive)
    if (user && user.id) {
      await client.query(`
        UPDATE students SET status = CASE WHEN $1 THEN 'inactive' ELSE 'active' END, updated_at = NOW()
        WHERE user_id = $2 AND status IN ('active','inactive','ativo','inativo')
      `, [disabled, id]);
    }

    // Se for escola, propagar para todos os alunos vinculados
    if (user && user.type === 'school') {
      // Atualizar status no registro de students
      await client.query(`
        UPDATE students SET status = CASE WHEN $1 THEN 'inactive' ELSE 'active' END, updated_at = NOW()
        WHERE school_id = $2
      `, [disabled, id]);

      // Desabilitar/Habilitar contas dos alunos (users.type='candidate') vinculados à escola
      await client.query(`
        UPDATE users u
        SET disabled = $1, updated_at = NOW()
        FROM students s
        WHERE u.id = s.user_id AND s.school_id = $2 AND u.type = 'candidate'
      `, [disabled, id]);
    }

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      disabled ? 'USER_DISABLED' : 'USER_ENABLED',
      'user',
      id,
      JSON.stringify({ targetUser: user.email }),
      req.ip
    ]);

    res.json({
      message: `Usuário ${disabled ? 'desabilitado' : 'habilitado'} com sucesso`,
  user: {
        id: user.id,
        email: user.email,
        name: user.name || user.company_name,
        disabled: user.disabled
      }
    });

  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// DELETE /api/users/profile/delete - Deletar próprio perfil (empresa)
router.delete('/profile/delete', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;

    // Verificar se é uma empresa
    if (req.user.type !== 'company') {
      return res.status(403).json({
        error: 'Apenas empresas podem excluir seus próprios perfis',
        code: 'ACCESS_DENIED'
      });
    }

    // Começar transação
    await client.query('BEGIN');

    // Primeiro, excluir candidaturas relacionadas às vagas da empresa
    await client.query(`
      DELETE FROM applications 
      WHERE job_id IN (SELECT id FROM jobs WHERE company_id = $1)
    `, [userId]);

    // Excluir vagas da empresa
    await client.query('DELETE FROM jobs WHERE company_id = $1', [userId]);

    // Excluir logs de atividade do usuário
    await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);

    // Excluir sessões do usuário
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    // Finalmente, excluir o usuário
    const deleteResult = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Commitar a transação
    await client.query('COMMIT');

    console.log(`✅ Perfil da empresa ${userId} excluído com sucesso`);
    res.json({ message: 'Perfil excluído com sucesso' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao excluir perfil da empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// DELETE /api/users/:id - Deletar usuário (apenas admins)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Não permitir deletar a própria conta
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Você não pode deletar sua própria conta',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Verificar se usuário existe
    const userCheck = await client.query(
      'SELECT id, email, name, company_name FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userCheck.rows[0];

    // Deletar usuário (CASCADE deletará dados relacionados)
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      'USER_DELETED',
      'user',
      id,
      JSON.stringify({ 
        deletedUser: {
          email: user.email,
          name: user.name || user.company_name
        }
      }),
      req.ip
    ]);

    res.json({
      message: 'Usuário deletado com sucesso',
      deletedUser: {
        id: user.id,
        email: user.email,
        name: user.name || user.company_name
      }
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// POST /api/users/bulk-action - Ações em lote (apenas admins)
router.post('/bulk-action', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { action, userIds } = req.body;

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'Ação e IDs dos usuários são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Remover o próprio usuário da lista
    const filteredIds = userIds.filter(id => id !== req.user.id);

    if (filteredIds.length === 0) {
      return res.status(400).json({
        error: 'Você não pode executar ações em lote em sua própria conta',
        code: 'CANNOT_BULK_ACTION_SELF'
      });
    }

    let result;
    let actionName;

    switch (action) {
      case 'disable':
        result = await client.query(`
          UPDATE users 
          SET disabled = true, updated_at = NOW()
          WHERE id = ANY($1::uuid[])
          RETURNING id, email, name, company_name
        `, [filteredIds]);
        actionName = 'USERS_BULK_DISABLED';
        break;

      case 'enable':
        result = await client.query(`
          UPDATE users 
          SET disabled = false, updated_at = NOW()
          WHERE id = ANY($1::uuid[])
          RETURNING id, email, name, company_name
        `, [filteredIds]);
        actionName = 'USERS_BULK_ENABLED';
        break;

      case 'delete':
        result = await client.query(`
          DELETE FROM users 
          WHERE id = ANY($1::uuid[])
          RETURNING id, email, name, company_name
        `, [filteredIds]);
        actionName = 'USERS_BULK_DELETED';
        break;

      default:
        return res.status(400).json({
          error: 'Ação inválida. Use: disable, enable ou delete',
          code: 'INVALID_ACTION'
        });
    }

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      req.user.id,
      actionName,
      JSON.stringify({ 
        affectedUsers: result.rows.map(u => ({ 
          id: u.id, 
          email: u.email, 
          name: u.name || u.company_name 
        }))
      }),
      req.ip
    ]);

    res.json({
      message: `Ação executada com sucesso em ${result.rows.length} usuário(s)`,
      affectedUsers: result.rows.length,
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || user.company_name
      }))
    });

  } catch (error) {
    console.error('Erro na ação em lote:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// POST /api/users/:id/avatar - Upload de avatar
router.post('/:id/avatar', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { avatar } = req.body;

    console.log('🔍 POST /api/users/:id/avatar - Upload de avatar:', {
      id,
      avatarLength: avatar ? avatar.length : 0
    });

    // Verificar permissões: próprio usuário, admin ou escola vinculada ao aluno
    const isOwner = req.user.id === id;
    const isAdmin = req.user.type === 'admin' || req.user.is_admin;
    let isSchoolAuthorized = false;
    if (req.user.type === 'school') {
      try {
        const s = await client.query('SELECT 1 FROM students WHERE user_id=$1 AND school_id=$2 LIMIT 1', [id, req.user.id]);
        if (s.rows.length > 0) isSchoolAuthorized = true;
      } catch(_) {}
    }
    if (!isOwner && !isAdmin && !isSchoolAuthorized) {
      return res.status(403).json({
        error: 'Você só pode alterar seu próprio avatar',
        code: 'ACCESS_DENIED'
      });
    }

    // Verificar se usuário existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Validar base64
    if (!avatar || !avatar.startsWith('data:image/')) {
      return res.status(400).json({
        error: 'Avatar deve ser uma imagem em formato base64',
        code: 'INVALID_AVATAR_FORMAT'
      });
    }

    // Atualizar avatar no banco
    const result = await client.query(
      'UPDATE users SET profile_image = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_image',
      [avatar, id]
    );

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      'AVATAR_UPDATED',
      'user',
      id,
      JSON.stringify({ avatar_updated: true }),
      req.ip
    ]);

    res.json({
      message: 'Avatar atualizado com sucesso',
      profileImage: result.rows[0].profile_image
    });

  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

export default router;
