import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireCandidate } from '../middleware/auth.js';
import { handleValidationErrors, validateResume } from '../middleware/validation.js';
import debugUpload from '../middleware/upload.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import * as aiService from '../services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/resumes - Listar currículos do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Filtrar currículos que não foram deletados (deleted_at IS NULL)
    const result = await pool.query(
      `SELECT 
        id, 
        title, 
        template, 
        is_public, 
        personal_info, 
        experience, 
        education, 
        skills, 
        languages, 
        projects, 
        courses,
        original_file_path,
        original_file_name,
        created_at, 
        updated_at 
      FROM resumes 
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY updated_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      resumes: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar currículos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// GET /api/resumes/user/:userId - Listar currículos de um usuário (admin, owner ou escola autorizada)
router.get('/user/:userId', async (req, res) => {
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

    // Checar se empresa tem ao menos uma candidatura deste candidato
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
        console.error('Erro ao verificar autorização da empresa para ver currículos do candidato:', e.message);
      }
    }

    if (!isAdmin && !isOwner && !isSchoolAuthorized && !isCompanyAuthorized) {
      return res.status(403).json({ error: 'Acesso negado', code: 'ACCESS_DENIED' });
    }

    // Se a empresa está autorizada mas não é admin/owner, opcionalmente poderíamos filtrar apenas públicos ou usados em candidaturas.
    // Por enquanto, retorno todos para facilitar avaliação do perfil.
    const result = await pool.query(
      `SELECT 
        id, title, template, is_public, personal_info, experience, education, skills, languages, projects, courses, original_file_path, original_file_name, created_at, updated_at
       FROM resumes
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    res.json({ success: true, resumes: result.rows });
  } catch (error) {
    console.error('Erro ao buscar currículos por usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/resumes/default - Obter currículo mais recente (funcionalidade padrão desativada)
router.get('/default', async (req, res) => {
  try {
    console.log('🎯 Buscando currículo mais recente para usuário:', req.user.id);
    const userId = req.user.id;

    // Buscar o currículo mais recente (funcionalidade de padrão desativada)
    const result = await pool.query(
      `SELECT * FROM resumes 
      WHERE user_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log('⚠️ Usuário não tem currículos');
      return res.status(404).json({
        error: 'Nenhum currículo encontrado',
        code: 'NO_RESUMES_FOUND'
      });
    }

    console.log('✅ Currículo mais recente encontrado:', result.rows[0].id);
    res.json({
      success: true,
      resume: result.rows[0],
      isDefault: false // Campo mantido para compatibilidade
    });
  } catch (error) {
    console.error('❌ Erro ao buscar currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// PATCH /api/resumes/:id/set-default - Funcionalidade desativada (sem coluna is_default)
router.patch('/:id/set-default', async (req, res) => {
  // Funcionalidade temporariamente desativada - coluna is_default não existe
  res.json({
    success: true,
    message: 'Funcionalidade de currículo padrão está desativada no momento',
    note: 'Todos os currículos são tratados igualmente'
  });
});

// GET /api/resumes/:id - Obter currículo específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.type;
    
    console.log('🔍 GET /api/resumes/:id - ID:', id, 'User:', userId, 'Type:', userType);
    
    // Se for o próprio dono ou se é público
    let query = `SELECT * FROM resumes WHERE id = $1 AND (user_id = $2 OR is_public = true)`;
    let params = [id, userId];
    
    // Se for empresa, verificar se tem alguma candidatura com esse currículo
    if (userType === 'company') {
      query = `
        SELECT r.* FROM resumes r
        WHERE r.id = $1 AND (
          r.user_id = $2 
          OR r.is_public = true 
          OR EXISTS (
            SELECT 1 FROM applications a 
            JOIN jobs j ON a.job_id = j.id 
            WHERE a.resume_id = r.id AND j.company_id = $2
          )
        )`;
    }
    
    console.log('🔍 Query para buscar currículo:', query);
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      console.log('❌ Currículo não encontrado ou sem permissão');
      return res.status(404).json({
        error: 'Currículo não encontrado',
        code: 'RESUME_NOT_FOUND'
      });
    }

    console.log('✅ Currículo encontrado:', result.rows[0].title);
    res.json({
      success: true,
      resume: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao buscar currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// POST /api/resumes - Criar novo currículo
router.post('/', validateResume, handleValidationErrors, async (req, res) => {
  try {
    console.log('🔍 POST /api/resumes - Dados recebidos:', req.body);
    
    const userId = req.user.id;
    const {
      title,
      template = 'default',
      is_public = true,
      personal_info,
      experience,
      education,
      skills,
      languages,
      projects,
      courses
    } = req.body;

    console.log('📝 Criando currículo com:', {
      userId,
      title,
      template,
      is_public,
      personal_info: personal_info ? 'presente' : 'ausente'
    });

    const result = await pool.query(
      `INSERT INTO resumes (
        user_id, title, template, is_public, 
        personal_info, experience, education, 
        skills, languages, projects, courses
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId, title, template, is_public,
        JSON.stringify(personal_info || {}),
        JSON.stringify(experience || []),
        JSON.stringify(education || []),
        JSON.stringify(skills || []),
        JSON.stringify(languages || []),
        JSON.stringify(projects || []),
        JSON.stringify(courses || [])
      ]
    );

    console.log('✅ Currículo criado:', result.rows[0].id);
    
    // Auto-analisar currículo com IA logo após criar
    const createdResume = result.rows[0];
    try {
      console.log('🤖 Iniciando análise automática do currículo...');
      const analysis = await aiService.analyzeResume(createdResume);
      
      // Salvar análise no banco
      await pool.query(
        `UPDATE resumes 
        SET 
          ai_analysis_score = $1,
          ai_analysis = $2,
          ai_analyzed_at = NOW()
        WHERE id = $3`,
        [analysis.score, JSON.stringify(analysis), createdResume.id]
      );
      
      console.log('✅ Análise automática concluída:', analysis.score);
      
      // Retornar currículo com análise
      const updatedResume = await pool.query(
        'SELECT * FROM resumes WHERE id = $1',
        [createdResume.id]
      );
      
      res.status(201).json({
        success: true,
        message: 'Currículo criado e analisado com sucesso',
        resume: updatedResume.rows[0],
        analysis: analysis
      });
    } catch (aiError) {
      console.error('⚠️  Erro na análise automática:', aiError.message);
      // Ainda assim retornar o currículo criado, mesmo que a análise falhe
      res.status(201).json({
        success: true,
        message: 'Currículo criado, mas análise automática falhou',
        resume: createdResume,
        analysis_error: aiError.message
      });
    }
  } catch (error) {
    console.error('❌ Erro ao criar currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// PUT /api/resumes/:id - Atualizar currículo
router.put('/:id', validateResume, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      template,
      is_public,
      personal_info,
      experience,
      education,
      skills,
      languages,
      projects,
      courses
    } = req.body;

    // Verificar se o currículo pertence ao usuário
    const existingResult = await pool.query(
      'SELECT id FROM resumes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Currículo não encontrado ou não autorizado',
        code: 'RESUME_NOT_FOUND'
      });
    }

    const result = await pool.query(
      `UPDATE resumes SET 
        title = $1, 
        template = $2, 
        is_public = $3, 
        personal_info = $4, 
        experience = $5, 
        education = $6, 
        skills = $7, 
        languages = $8, 
        projects = $9, 
        courses = $10,
        updated_at = CURRENT_TIMESTAMP,
        ai_analysis = NULL,
        ai_analyzed_at = NULL,
        ai_analysis_score = NULL
      WHERE id = $11 AND user_id = $12
      RETURNING *`,
      [
        title, template, is_public,
        JSON.stringify(personal_info),
        JSON.stringify(experience),
        JSON.stringify(education),
        JSON.stringify(skills),
        JSON.stringify(languages),
        JSON.stringify(projects),
        JSON.stringify(courses),
        id, userId
      ]
    );

    res.json({
      success: true,
      message: 'Currículo atualizado com sucesso',
      resume: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// DELETE /api/resumes/:id - Excluir currículo (soft delete)
// O currículo NÃO é realmente deletado - apenas marcado como deletado
// Isso permite que empresas e escolas continuem vendo currículos de candidaturas anteriores
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o currículo pertence ao usuário e não foi deletado
    const checkResult = await pool.query(
      'SELECT id FROM resumes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Currículo não encontrado ou não autorizado',
        code: 'RESUME_NOT_FOUND'
      });
    }

    // SOFT DELETE: Apenas marca como deletado, não remove do banco
    // O currículo continua visível para empresas/escolas em candidaturas
    const result = await pool.query(
      'UPDATE resumes SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    console.log(`📋 [SOFT DELETE RESUME] Currículo ${id} marcado como deletado (continua visível para empresas/escolas)`);

    res.json({
      success: true,
      message: 'Currículo excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// POST /api/resumes/upload - Upload de currículo externo
// Use the upload middleware (multer) to process the multipart/form-data and
// then continue to the async handler which creates the resume record and
// returns the created resume in the response.
router.post('/upload', debugUpload, async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      extractedText,
      parsedData
    } = req.body;

    console.log('📁 [UPLOAD] File:', req.file ? req.file.originalname : 'Missing');
    console.log('📋 [UPLOAD] Body:', req.body);
    console.log('📋 [UPLOAD] Files:', req.files);
    console.log('📋 [UPLOAD] User:', req.user);

    // Verificar se o arquivo foi carregado
    if (!req.file) {
      console.log('❌ [UPLOAD] Erro: Arquivo não encontrado');
      return res.status(400).json({
        error: 'Arquivo de currículo é obrigatório',
        code: 'FILE_REQUIRED'
      });
    }

    // Calcular hash MD5 do arquivo para detectar duplicatas
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    console.log('🔐 [UPLOAD] File hash:', fileHash);

    // Verificar se já existe um currículo com o mesmo hash para este usuário
    const existingResume = await pool.query(
      `SELECT id, title, original_file_path, original_file_name, created_at 
       FROM resumes 
       WHERE user_id = $1 AND file_hash = $2`,
      [userId, fileHash]
    );

    if (existingResume.rows.length > 0) {
      console.log('⚠️ [UPLOAD] Currículo duplicado detectado, retornando existente:', existingResume.rows[0].id);
      // Remover o arquivo duplicado que foi carregado
      try {
        fs.unlinkSync(filePath);
        console.log('🗑️ [UPLOAD] Arquivo duplicado removido');
      } catch (e) {
        console.error('❌ [UPLOAD] Erro ao remover arquivo duplicado:', e);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Currículo já existe',
        resume: existingResume.rows[0],
        isDuplicate: true
      });
    }

    // Parse dos dados se vieram como string
    let parsedDataObj;
    try {
      parsedDataObj = typeof parsedData === 'string' ? JSON.parse(parsedData) : parsedData;
    } catch (error) {
      console.error('❌ [UPLOAD] Erro ao fazer parse do parsedData:', error);
      parsedDataObj = {};
    }

    // Criar currículo baseado no arquivo carregado
    console.log('📝 [UPLOAD] Dados para INSERT:', {
      userId,
      title: parsedDataObj.name || `Currículo - ${req.file.originalname}`,
      template: 'uploaded',
      is_public: true,
      personal_info: {
        name: parsedDataObj.name,
        email: parsedDataObj.email,
        phone: parsedDataObj.phone,
        originalFileName: req.file.originalname,
        extractedText: extractedText?.substring(0, 1000)
      },
      experience: parsedDataObj.experiences || [],
      education: parsedDataObj.education || [],
      skills: [],
      languages: parsedDataObj.languages || [],
      projects: parsedDataObj.projects || [],
      courses: parsedDataObj.courses || [],
      original_file_path: req.file.filename,
      original_file_name: req.file.originalname,
      file_hash: fileHash
    });
    const result = await pool.query(
      `INSERT INTO resumes (
        user_id, title, template, is_public, 
        personal_info, experience, education, 
        skills, languages, projects, courses,
        original_file_path,
        original_file_name,
        file_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId,
        parsedDataObj.name || `Currículo - ${req.file.originalname}`,
        'uploaded',
        true,
        JSON.stringify({
          name: parsedDataObj.name,
          email: parsedDataObj.email,
          phone: parsedDataObj.phone,
          originalFileName: req.file.originalname,
          extractedText: extractedText?.substring(0, 1000)
        }),
        JSON.stringify(parsedDataObj.experiences || []),
        JSON.stringify(parsedDataObj.education || []),
        JSON.stringify([]),
        JSON.stringify(parsedDataObj.languages || []),
        JSON.stringify(parsedDataObj.projects || []),
        JSON.stringify(parsedDataObj.courses || []),
        req.file.filename, // Caminho do arquivo salvo
        req.file.originalname, // Nome do arquivo original
        fileHash // Hash MD5 do arquivo para detectar duplicatas
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Currículo carregado com sucesso',
      resume: result.rows[0]
    });
  } catch (error) {
    console.error('❌ [UPLOAD] Erro ao fazer upload do currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// GET /api/resumes/:id/download - Download do arquivo original do currículo
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Buscar o currículo e verificar permissões
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM resumes r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND (r.user_id = $2 OR r.is_public = true)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Currículo não encontrado ou sem permissão',
        code: 'RESUME_NOT_FOUND'
      });
    }

    const resume = result.rows[0];

    // Verificar se tem arquivo original; se não houver, gerar fallback HTML baseado nos dados estruturados
    if (!resume.original_file_path) {
      try {
        const parseJSON = (val, fallback) => {
          if (!val) return fallback;
          if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
          return val;
        };
        const personal = parseJSON(resume.personal_info, {});
        const experience = parseJSON(resume.experience, []);
        const education = parseJSON(resume.education, []);
        const skills = parseJSON(resume.skills, []);
        const languages = parseJSON(resume.languages, []);
        const projects = parseJSON(resume.projects, []);
        const courses = parseJSON(resume.courses, []);

        res.setHeader('Content-Disposition', `attachment; filename="${(resume.title||'curriculo').replace(/[^a-z0-9_\-]+/gi,'_')}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);
        const title = resume.title || personal.fullName || personal.name || 'Currículo';
        doc.fontSize(22).text(title, { underline: false });
        doc.moveDown(0.5);
        const contact = [personal.email, personal.phone].filter(Boolean).join(' • ');
        if (contact) doc.fontSize(10).fillColor('#444').text(contact);
        doc.moveDown();

        const addSection = (label) => { doc.moveDown(); doc.fontSize(14).fillColor('#000').text(label); doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).strokeColor('#ddd').stroke(); doc.moveDown(0.5); doc.fillColor('#111'); };

        if (experience.length) {
          addSection('Experiências');
          experience.forEach(e => {
            const line1 = `${e.role||e.position||'Cargo'}${e.company?' - '+e.company:''}`;
            doc.fontSize(11).text(line1, { continued: false });
            const dates = [e.start_date||e.startDate, e.end_date||e.endDate||'Atual'].filter(Boolean).join(' - ');
            if (dates) doc.fontSize(9).fillColor('#555').text(dates).fillColor('#111');
            if (e.description) doc.fontSize(10).text(e.description);
            doc.moveDown(0.5);
          });
        }

        if (education.length) {
          addSection('Educação');
            education.forEach(ed => {
              const line1 = `${ed.institution||ed.school||'Instituição'}${ed.degree?' - '+ed.degree:''}${ed.course?' - '+ed.course:''}`;
              doc.fontSize(11).text(line1);
              const dates = [ed.start_year||ed.startYear, ed.end_year||ed.endYear||'Atual'].filter(Boolean).join(' - ');
              if (dates) doc.fontSize(9).fillColor('#555').text(dates).fillColor('#111');
              doc.moveDown(0.5);
            });
        }

        if (skills.length) {
          addSection('Habilidades');
          doc.fontSize(10).text(skills.map(s=> (s.name||s)).join(', '));
        }

        if (languages.length) {
          addSection('Idiomas');
          languages.forEach(l => {
            doc.fontSize(10).text(`${l.name||l.language||l.idioma||'Idioma'}${l.level?': '+l.level:''}`);
          });
        }

        if (projects.length) {
          addSection('Projetos');
          projects.forEach(p => {
            doc.fontSize(11).text(p.name||'Projeto');
            if (p.url) doc.fontSize(9).fillColor('#1d4ed8').text(p.url).fillColor('#111');
            if (p.description) doc.fontSize(10).text(p.description);
            doc.moveDown(0.5);
          });
        }

        if (courses.length) {
          addSection('Cursos');
          courses.forEach(c => {
            doc.fontSize(10).text(`${c.name||c.course||'Curso'}${c.institution?' - '+c.institution:''}`);
          });
        }

        doc.moveDown();
        doc.fontSize(8).fillColor('#666').text('Gerado automaticamente - CurrículoJá', { align: 'center' });
        doc.end();
        return; // encerra aqui sem continuar fluxo de arquivo original
      } catch (genErr) {
        console.error('Erro gerando fallback PDF:', genErr);
        return res.status(404).json({ error:'Arquivo original não disponível', code:'FILE_NOT_AVAILABLE'});
      }
    }

    // Caminho completo do arquivo
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, resume.original_file_path);

    // Verificar se arquivo existe fisicamente
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Arquivo não encontrado no servidor',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Obter informações do arquivo original
    const personalInfo = typeof resume.personal_info === 'string' 
      ? JSON.parse(resume.personal_info) 
      : resume.personal_info;
    
    const originalFileName = personalInfo?.originalFileName || 'curriculo.pdf';
    
    // Definir headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Enviar arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erro ao baixar currículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// POST /api/resumes/:id/send-email - Envia o currículo por e-mail como anexo (server-side)
router.post('/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { to, subject, body } = req.body || {};

    if (!to) {
      return res.status(400).json({ error: 'Destinatário (to) é obrigatório', code: 'TO_REQUIRED' });
    }

    // Buscar o currículo e checar permissão (apenas dono ou currículo público)
    const result = await pool.query(
      `SELECT * FROM resumes WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currículo não encontrado ou sem permissão', code: 'RESUME_NOT_FOUND' });
    }
    const resume = result.rows[0];

    // Obter Buffer do arquivo (ou gerar PDF com base nos dados)
    const getResumeBufferAndName = async () => {
      if (resume.original_file_path) {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadsDir, resume.original_file_path);
        if (!fs.existsSync(filePath)) {
          throw new Error('Arquivo original não encontrado no servidor');
        }
        const buf = await fs.promises.readFile(filePath);
        // Tentar usar nome original salvo
        const personalInfo = typeof resume.personal_info === 'string' ? JSON.parse(resume.personal_info) : resume.personal_info;
        const name = personalInfo?.originalFileName || resume.original_file_name || 'curriculo.pdf';
        return { buffer: buf, filename: name, contentType: 'application/octet-stream' };
      }

      // Gerar PDF em memória via PDFKit
      const chunks = [];
      const doc = new PDFDocument({ margin: 50 });
      const p = new Promise((resolve, reject) => {
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });

      const parseJSON = (val, fallback) => {
        if (!val) return fallback;
        if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
        return val;
      };
      const personal = parseJSON(resume.personal_info, {});
      const experience = parseJSON(resume.experience, []);
      const education = parseJSON(resume.education, []);
      const skills = parseJSON(resume.skills, []);
      const languages = parseJSON(resume.languages, []);
      const projects = parseJSON(resume.projects, []);
      const courses = parseJSON(resume.courses, []);

      const title = resume.title || personal.fullName || personal.name || 'Currículo';
      doc.fontSize(22).text(title);
      doc.moveDown(0.5);
      const contact = [personal.email, personal.phone].filter(Boolean).join(' • ');
      if (contact) doc.fontSize(10).fillColor('#444').text(contact); doc.moveDown();
      const addSection = (label) => { doc.moveDown(); doc.fontSize(14).fillColor('#000').text(label); doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).strokeColor('#ddd').stroke(); doc.moveDown(0.5); doc.fillColor('#111'); };
      if (experience.length) { addSection('Experiências'); experience.forEach(e=>{ const line1 = `${e.role||e.position||'Cargo'}${e.company?' - '+e.company:''}`; doc.fontSize(11).text(line1); const dates=[e.start_date||e.startDate,e.end_date||e.endDate||'Atual'].filter(Boolean).join(' - '); if (dates) doc.fontSize(9).fillColor('#555').text(dates).fillColor('#111'); if (e.description) doc.fontSize(10).text(e.description); doc.moveDown(0.5); }); }
      if (education.length) { addSection('Educação'); education.forEach(ed=>{ const line1=`${ed.institution||ed.school||'Instituição'}${ed.degree?' - '+ed.degree:''}${ed.course?' - '+ed.course:''}`; doc.fontSize(11).text(line1); const dates=[ed.start_year||ed.startYear,ed.end_year||ed.endYear||'Atual'].filter(Boolean).join(' - '); if (dates) doc.fontSize(9).fillColor('#555').text(dates).fillColor('#111'); doc.moveDown(0.5); }); }
      if (skills.length) { addSection('Habilidades'); doc.fontSize(10).text(skills.map(s=> (s.name||s)).join(', ')); }
      if (languages.length) { addSection('Idiomas'); languages.forEach(l=> doc.fontSize(10).text(`${l.name||l.language||l.idioma||'Idioma'}${l.level?': '+l.level:''}`)); }
      if (projects.length) { addSection('Projetos'); projects.forEach(p=>{ doc.fontSize(11).text(p.name||'Projeto'); if (p.url) doc.fontSize(9).fillColor('#1d4ed8').text(p.url).fillColor('#111'); if (p.description) doc.fontSize(10).text(p.description); doc.moveDown(0.5); }); }
      if (courses.length) { addSection('Cursos'); courses.forEach(c=> doc.fontSize(10).text(`${c.name||c.course||'Curso'}${c.institution?' - '+c.institution:''}`)); }
      doc.moveDown(); doc.fontSize(8).fillColor('#666').text('Gerado automaticamente - CurrículoJá', { align: 'center' });
      doc.end();
      const buffer = await p;
      return { buffer, filename: `${(resume.title||'curriculo').replace(/[^a-z0-9_\-]+/gi,'_')}.pdf`, contentType: 'application/pdf' };
    };

    const { buffer, filename, contentType } = await getResumeBufferAndName();

    // Configurar transporte SMTP via variáveis de ambiente
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      return res.status(500).json({ error: 'SMTP não configurado no servidor', code: 'SMTP_NOT_CONFIGURED' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE||'false') === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    const mailOptions = {
      from: SMTP_FROM,
      to,
      subject: subject || 'Candidatura',
      text: body || 'Olá, estou me candidatando à vaga auxiliar de produção. Segue meu currículo.',
      attachments: [ { filename, content: buffer, contentType } ]
    };

    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'E-mail enviado com sucesso', id: info.messageId });
  } catch (error) {
    console.error('Erro ao enviar e-mail com currículo:', error);
    res.status(500).json({ error: 'Falha ao enviar e-mail', code: 'EMAIL_SEND_FAILED' });
  }
});

/**
 * ==========================================
 * ROTAS DE IA - Análise e Reescrita
 * ==========================================
 */

/**
 * POST /api/resumes/:id/analyze
 * Analisa um currículo usando OpenAI GPT-4o-mini
 */
router.post('/:id/analyze', requireCandidate, async (req, res) => {
  const resumeId = req.params.id;
  const userId = req.user.id;

  try {
    console.log(`📊 POST /api/resumes/${resumeId}/analyze - Usuário: ${userId}`);

    // 1. Buscar currículo no banco
    const resumeQuery = `
      SELECT * FROM resumes 
      WHERE id = $1 AND user_id = $2
    `;
    const resumeResult = await pool.query(resumeQuery, [resumeId, userId]);

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Currículo não encontrado',
      });
    }

    const resume = resumeResult.rows[0];

    // 2. Verificar se já foi analisado e não foi editado desde então
    let analysis;
    if (resume.ai_analysis && resume.ai_analyzed_at) {
      const analysisDate = new Date(resume.ai_analyzed_at);
      const resumeUpdateDate = new Date(resume.updated_at);
      
      if (analysisDate >= resumeUpdateDate) {
        // Análise está atualizada, reutilizar
        console.log('♻️  Análise anterior encontrada, reutilizando...');
        analysis = resume.ai_analysis;
        
        return res.json({
          success: true,
          score: analysis.score,
          analysis: analysis,
          analyzed_at: resume.ai_analyzed_at,
          cached: true
        });
      }
    }

    // 3. Chamar serviço de IA (nova análise)
    try {
      analysis = await aiService.analyzeResume(resume);
    } catch (aiError) {
      console.error('❌ Erro da IA:', aiError.message);
      return res.status(500).json({
        success: false,
        error: aiError.message,
      });
    }

    // 4. Salvar análise no banco
    const updateQuery = `
      UPDATE resumes 
      SET 
        ai_analysis_score = $1,
        ai_analysis = $2,
        ai_analyzed_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING ai_analysis_score, ai_analysis, ai_analyzed_at
    `;

    const updateResult = await pool.query(updateQuery, [
      analysis.score,
      JSON.stringify(analysis),
      resumeId,
      userId,
    ]);

    if (updateResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar análise no banco de dados',
      });
    }

    // 4. Retornar análise ao cliente
    res.json({
      success: true,
      score: analysis.score,
      analysis: analysis,
      analyzed_at: updateResult.rows[0].ai_analyzed_at,
    });
  } catch (error) {
    console.error('❌ Erro na análise de currículo:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao analisar currículo. Tente novamente em alguns momentos.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/resumes/:id/rewrite
 * Reescreve um trecho de texto do currículo
 */
router.post('/:id/rewrite', requireCandidate, async (req, res) => {
  const resumeId = req.params.id;
  const userId = req.user.id;
  const { text, context = 'general' } = req.body;

  try {
    console.log(`✏️ POST /api/resumes/${resumeId}/rewrite - Contexto: ${context}`);

    // Validar entrada
    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Texto deve ter pelo menos 10 caracteres',
      });
    }

    // Verificar propriedade do currículo
    const resumeQuery = 'SELECT id FROM resumes WHERE id = $1 AND user_id = $2';
    const resumeResult = await pool.query(resumeQuery, [resumeId, userId]);

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Currículo não encontrado',
      });
    }

    // Chamar IA para reescrever
    let rewritten;
    try {
      rewritten = await aiService.rewriteText(text, context);
    } catch (aiError) {
      console.error('❌ Erro ao reescrever:', aiError.message);
      return res.status(500).json({
        success: false,
        error: aiError.message,
      });
    }

    res.json({
      success: true,
      original: text,
      rewritten: rewritten,
      context: context,
    });
  } catch (error) {
    console.error('❌ Erro na reescrita:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao reescrever texto. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/resumes/:id/keywords
 * Gera sugestões de keywords para o currículo
 */
router.get('/:id/keywords', requireCandidate, async (req, res) => {
  const resumeId = req.params.id;
  const userId = req.user.id;

  try {
    console.log(`🔑 GET /api/resumes/${resumeId}/keywords`);

    // 1. Buscar currículo
    const resumeQuery = `
      SELECT * FROM resumes 
      WHERE id = $1 AND user_id = $2
    `;
    const resumeResult = await pool.query(resumeQuery, [resumeId, userId]);

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Currículo não encontrado',
      });
    }

    const resume = resumeResult.rows[0];

    // 2. Gerar keywords
    let keywords;
    try {
      keywords = await aiService.suggestKeywords(resume);
    } catch (aiError) {
      console.error('❌ Erro ao gerar keywords:', aiError.message);
      return res.status(500).json({
        success: false,
        error: aiError.message,
        keywords: [],
      });
    }

    res.json({
      success: true,
      keywords: keywords || [],
    });
  } catch (error) {
    console.error('❌ Erro ao obter keywords:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar keywords. Tente novamente.',
      keywords: [],
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
