import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Criar tabela se não existir
const ensureTable = async () => {
  // Verificar se a tabela existe
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'journey_responses'
    )
  `);
  
  if (!tableCheck.rows[0].exists) {
    // Criar tabela nova
    await pool.query(`
      CREATE TABLE journey_responses (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        stage_id INTEGER NOT NULL DEFAULT 0,
        
        -- Respostas de autoavaliação (escalas 1-10)
        nervoso INTEGER,
        preparado_entrevista INTEGER,
        preparado_vaga INTEGER,
        
        -- Resposta sobre quando quer trabalhar
        quando_trabalhar_value INTEGER,
        quando_trabalhar_text TEXT,
        
        -- Resposta sobre expectativas de estagiário
        estagiario_correct BOOLEAN,
        
        -- Resultados da entrevista simulada
        interview_score INTEGER,
        interview_max_score INTEGER,
        interview_level VARCHAR(50),
        interview_answers JSONB,
        
        -- Dados extras para outras etapas (JSONB genérico)
        extra_data JSONB,
        
        -- Metadados
        school_type_category VARCHAR(50),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Índices para performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_journey_user ON journey_responses(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_journey_student ON journey_responses(student_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_journey_stage ON journey_responses(stage_id)`);
    
    console.log('✅ Tabela journey_responses criada com sucesso');
  } else {
    // Verificar se a coluna extra_data existe, se não, adicionar
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journey_responses'
        AND column_name = 'extra_data'
      )
    `);
    
    if (!columnCheck.rows[0].exists) {
      await pool.query(`ALTER TABLE journey_responses ADD COLUMN extra_data JSONB`);
      console.log('✅ Coluna extra_data adicionada à tabela journey_responses');
    }
    
    console.log('✅ Tabela journey_responses já existe');
  }
};

// Inicializar tabela
ensureTable().catch(console.error);

// POST /api/journey/stage/:stageId - Salvar respostas de uma etapa
router.post('/stage/:stageId', authenticateToken, async (req, res) => {
  console.log('📥 Journey POST recebido:', { stageId: req.params.stageId, userId: req.user?.id });
  console.log('📥 Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { stageId } = req.params;
    const stageIdInt = parseInt(stageId, 10);
    const userId = req.user.id;
    const {
      selfAssessment,
      interviewResult,
      schoolTypeCategory,
      // Dados genéricos para outras etapas
      quizAnswers,
      gameResult
    } = req.body;

    // Buscar student_id se for candidato
    let studentId = null;
    if (req.user.type === 'candidate') {
      console.log('📥 Buscando student_id para candidato:', userId);
      const studentRes = await pool.query(
        'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      console.log('📥 Resultado student query:', studentRes.rows);
      if (studentRes.rows.length > 0) {
        studentId = studentRes.rows[0].id;
      }
    }

    // Montar extra_data para etapas que não são a 0
    const extraData = {};
    if (quizAnswers) extraData.quizAnswers = quizAnswers;
    if (gameResult) extraData.gameResult = gameResult;

    // Verificar se já existe resposta para esta etapa
    const existing = await pool.query(
      'SELECT id FROM journey_responses WHERE user_id = $1 AND stage_id = $2',
      [userId, stageIdInt]
    );

    if (existing.rows.length > 0) {
      // Atualizar
      await pool.query(`
        UPDATE journey_responses SET
          nervoso = $1,
          preparado_entrevista = $2,
          preparado_vaga = $3,
          quando_trabalhar_value = $4,
          quando_trabalhar_text = $5,
          estagiario_correct = $6,
          interview_score = $7,
          interview_max_score = $8,
          interview_level = $9,
          interview_answers = $10,
          school_type_category = $11,
          extra_data = $12,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $13 AND stage_id = $14
      `, [
        selfAssessment?.nervoso || null,
        selfAssessment?.preparado_entrevista || null,
        selfAssessment?.preparado_vaga || null,
        selfAssessment?.quando_trabalhar?.value || null,
        selfAssessment?.quando_trabalhar?.text || null,
        selfAssessment?.estagiario?.correct || null,
        interviewResult?.score || null,
        interviewResult?.maxScore || null,
        interviewResult?.level || null,
        JSON.stringify(interviewResult?.answers || []),
        schoolTypeCategory || 'regular',
        Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null,
        userId,
        stageIdInt
      ]);

      console.log('✅ Journey response atualizado com sucesso para stage:', stageIdInt);
      res.json({ success: true, message: 'Respostas atualizadas' });
    } else {
      // Inserir novo
      console.log('📥 Inserindo novo registro para user:', userId, 'stage:', stageIdInt);
      await pool.query(`
        INSERT INTO journey_responses (
          user_id, student_id, stage_id,
          nervoso, preparado_entrevista, preparado_vaga,
          quando_trabalhar_value, quando_trabalhar_text,
          estagiario_correct,
          interview_score, interview_max_score, interview_level, interview_answers,
          school_type_category, extra_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        userId,
        studentId,
        stageIdInt,
        selfAssessment?.nervoso || null,
        selfAssessment?.preparado_entrevista || null,
        selfAssessment?.preparado_vaga || null,
        selfAssessment?.quando_trabalhar?.value || null,
        selfAssessment?.quando_trabalhar?.text || null,
        selfAssessment?.estagiario?.correct || null,
        interviewResult?.score || null,
        interviewResult?.maxScore || null,
        interviewResult?.level || null,
        JSON.stringify(interviewResult?.answers || []),
        schoolTypeCategory || 'regular',
        Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null
      ]);

      console.log('✅ Journey response inserido com sucesso para stage:', stageIdInt);
      res.json({ success: true, message: 'Respostas salvas' });
    }
  } catch (error) {
    console.error('❌ Erro ao salvar respostas da jornada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/journey/my-progress - Obter progresso do usuário
router.get('/my-progress', authenticateToken, async (req, res) => {
  console.log('📥 Journey my-progress chamado para user:', req.user?.id);
  
  try {
    const userId = req.user.id;
    
    const responses = await pool.query(
      'SELECT * FROM journey_responses WHERE user_id = $1 ORDER BY stage_id',
      [userId]
    );

    // Calcular dados agregados para o frontend
    const completedStages = responses.rows.map(r => r.stage_id);
    let totalXP = 0;
    const badges = [];
    let candidateLevel = null;
    let selfAssessment = null;
    
    // Calcular XP e badges baseado nas etapas completadas
    const stageXP = { 0: 50, 1: 100, 2: 150, 3: 120, 4: 130, 5: 200, 6: 100 };
    const stageBadges = {
      0: '🎯 Primeiro Passo',
      1: '🧠 Mentalidade Certa',
      2: '📄 Currículo Pronto',
      3: '🔍 Candidato Estratégico',
      4: '👔 Profissional em Formação',
      5: '🎤 Entrevistável',
      6: '💪 Persistente'
    };
    
    for (const stage of completedStages) {
      totalXP += stageXP[stage] || 0;
      if (stageBadges[stage]) {
        badges.push(stageBadges[stage]);
      }
    }
    
    // Pegar nível do candidato da etapa 0
    const stage0 = responses.rows.find(r => r.stage_id === 0);
    if (stage0) {
      candidateLevel = stage0.interview_level;
      selfAssessment = {
        nervoso: stage0.nervoso,
        preparado_entrevista: stage0.preparado_entrevista,
        preparado_vaga: stage0.preparado_vaga,
        quando_trabalhar: {
          value: stage0.quando_trabalhar_value,
          text: stage0.quando_trabalhar_text
        },
        estagiario: {
          correct: stage0.estagiario_correct
        }
      };
    }

    console.log('📊 Progresso retornado:', { 
      userId, 
      completedStages, 
      totalXP, 
      badges: badges.length,
      candidateLevel 
    });

    res.json({ 
      responses: responses.rows,
      completedStages,
      totalXP,
      badges,
      candidateLevel,
      selfAssessment
    });
  } catch (error) {
    console.error('❌ Erro ao obter progresso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/journey/class/:classId/stats - Estatísticas da turma (para escola)
// Query param opcional: ?stage=0 (ou 1, 2, etc.) - se não fornecido, retorna dados de todas as etapas
router.get('/class/:classId/stats', authenticateToken, async (req, res) => {
  console.log('📊 Journey class stats chamado:', { classId: req.params.classId, stage: req.query.stage, userType: req.user?.type });
  
  try {
    const { classId } = req.params;
    const stageFilter = req.query.stage !== undefined ? parseInt(req.query.stage) : null;
    
    // Verificar se é escola
    if (req.user.type !== 'school' && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Tratamento especial para "featured" - alunos destacados
    // Para featured, retornamos dados vazios pois journey é por turma específica
    if (classId === 'featured') {
      return res.json({
        class_id: 'featured',
        stage_counts: {},
        responses: [],
        stats: {
          total_students_with_responses: 0,
          avg_nervoso: null,
          avg_preparado_entrevista: null,
          avg_preparado_vaga: null,
          avg_interview_score: null,
          levels: { excelente: 0, bom: 0, regular: 0, precisa_melhorar: 0 }
        },
        work_preference: [],
        nervosismo_distribution: [],
        preparacao_distribution: [],
        stage_specific: {}
      });
    }

    // Buscar contagem de alunos por etapa
    const stageCountsResult = await pool.query(`
      SELECT 
        jr.stage_id,
        COUNT(DISTINCT jr.user_id) as count
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1
      GROUP BY jr.stage_id
      ORDER BY jr.stage_id
    `, [classId]);
    
    const stageCounts = {};
    stageCountsResult.rows.forEach(row => {
      stageCounts[row.stage_id] = parseInt(row.count);
    });

    // Definir o filtro de etapa para as queries
    const stageCondition = stageFilter !== null ? `AND jr.stage_id = ${stageFilter}` : '';
    const stage0Condition = stageFilter !== null ? `AND jr.stage_id = ${stageFilter}` : 'AND jr.stage_id = 0';

    // Buscar respostas dos alunos da turma (filtrado por etapa se especificado)
    const responsesQuery = stageFilter !== null 
      ? `SELECT jr.*, u.name as student_name, s.id as student_id
         FROM journey_responses jr
         JOIN students s ON jr.student_id = s.id
         JOIN users u ON jr.user_id = u.id
         WHERE s.class_id = $1 AND jr.stage_id = $2
         ORDER BY jr.completed_at DESC`
      : `SELECT jr.*, u.name as student_name, s.id as student_id
         FROM journey_responses jr
         JOIN students s ON jr.student_id = s.id
         JOIN users u ON jr.user_id = u.id
         WHERE s.class_id = $1
         ORDER BY jr.completed_at DESC`;
    
    const responses = stageFilter !== null
      ? await pool.query(responsesQuery, [classId, stageFilter])
      : await pool.query(responsesQuery, [classId]);

    // Estatísticas agregadas (filtrado por etapa)
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT jr.user_id) as total_students_with_responses,
        AVG(jr.nervoso) as avg_nervoso,
        AVG(jr.preparado_entrevista) as avg_preparado_entrevista,
        AVG(jr.preparado_vaga) as avg_preparado_vaga,
        AVG(jr.interview_score) as avg_interview_score,
        COUNT(CASE WHEN jr.interview_level = 'Excelente' THEN 1 END) as level_excelente,
        COUNT(CASE WHEN jr.interview_level = 'Bom' THEN 1 END) as level_bom,
        COUNT(CASE WHEN jr.interview_level = 'Regular' THEN 1 END) as level_regular,
        COUNT(CASE WHEN jr.interview_level = 'Precisa Melhorar' THEN 1 END) as level_precisa_melhorar
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1 ${stageFilter !== null ? 'AND jr.stage_id = $2' : 'AND jr.stage_id = 0'}
    `;
    const stats = stageFilter !== null
      ? await pool.query(statsQuery, [classId, stageFilter])
      : await pool.query(statsQuery, [classId]);

    // Distribuição de "quando quer trabalhar" (apenas etapa 0/1)
    const workPreferenceQuery = `
      SELECT 
        quando_trabalhar_text,
        quando_trabalhar_value,
        COUNT(*) as count
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1 ${stageFilter !== null ? 'AND jr.stage_id = $2' : 'AND jr.stage_id = 0'} AND jr.quando_trabalhar_text IS NOT NULL
      GROUP BY quando_trabalhar_text, quando_trabalhar_value
      ORDER BY quando_trabalhar_value
    `;
    const workPreference = stageFilter !== null
      ? await pool.query(workPreferenceQuery, [classId, stageFilter])
      : await pool.query(workPreferenceQuery, [classId]);

    // Distribuição de níveis de nervosismo
    const nervosismoQuery = `
      SELECT 
        CASE 
          WHEN nervoso BETWEEN 1 AND 3 THEN 'Baixo (1-3)'
          WHEN nervoso BETWEEN 4 AND 6 THEN 'Médio (4-6)'
          WHEN nervoso BETWEEN 7 AND 10 THEN 'Alto (7-10)'
        END as level,
        COUNT(*) as count
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1 ${stageFilter !== null ? 'AND jr.stage_id = $2' : 'AND jr.stage_id = 0'} AND jr.nervoso IS NOT NULL
      GROUP BY level
      ORDER BY level
    `;
    const nervosismoDistribution = stageFilter !== null
      ? await pool.query(nervosismoQuery, [classId, stageFilter])
      : await pool.query(nervosismoQuery, [classId]);

    // Distribuição de preparação para entrevista
    const preparacaoQuery = `
      SELECT 
        CASE 
          WHEN preparado_entrevista BETWEEN 1 AND 3 THEN 'Baixo (1-3)'
          WHEN preparado_entrevista BETWEEN 4 AND 6 THEN 'Médio (4-6)'
          WHEN preparado_entrevista BETWEEN 7 AND 10 THEN 'Alto (7-10)'
        END as level,
        COUNT(*) as count
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1 ${stageFilter !== null ? 'AND jr.stage_id = $2' : 'AND jr.stage_id = 0'} AND jr.preparado_entrevista IS NOT NULL
      GROUP BY level
      ORDER BY level
    `;
    const preparacaoDistribution = stageFilter !== null
      ? await pool.query(preparacaoQuery, [classId, stageFilter])
      : await pool.query(preparacaoQuery, [classId]);

    const total = parseInt(stats.rows[0]?.total_students_with_responses || '0');
    
    // Calcular estatísticas específicas da etapa a partir do extra_data
    let stageSpecificStats = {};
    
    if (stageFilter !== null && stageFilter >= 1) {
      // Para etapas 2-7, calcular estatísticas a partir do extra_data
      const extraDataQuery = `
        SELECT extra_data
        FROM journey_responses jr
        JOIN students s ON jr.student_id = s.id
        WHERE s.class_id = $1 AND jr.stage_id = $2 AND jr.extra_data IS NOT NULL
      `;
      const extraDataResult = await pool.query(extraDataQuery, [classId, stageFilter]);
      
      const extraDataRows = extraDataResult.rows.filter(r => r.extra_data);
      
      if (extraDataRows.length > 0) {
        if (stageFilter === 1) {
          // Etapa 2 - Mentalidade: quizAnswers e gameResult
          let totalQuizCorrect = 0;
          let totalQuizQuestions = 0;
          let totalGameScore = 0;
          let gameCount = 0;
          
          extraDataRows.forEach(row => {
            const data = typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data;
            
            // Quiz answers - contar acertos
            if (data.quizAnswers) {
              const answers = Object.values(data.quizAnswers);
              totalQuizCorrect += answers.filter(a => a === true || a?.correct === true).length;
              totalQuizQuestions += answers.length;
            }
            
            // Game result
            if (data.gameResult) {
              totalGameScore += data.gameResult.score || 0;
              gameCount++;
            }
          });
          
          stageSpecificStats = {
            avg_quiz_correct: totalQuizQuestions > 0 ? totalQuizCorrect / totalQuizQuestions : null,
            avg_game_score: gameCount > 0 ? totalGameScore / gameCount : null,
            total_quiz_responses: totalQuizQuestions > 0 ? extraDataRows.filter(r => r.extra_data?.quizAnswers || (typeof r.extra_data === 'object' && r.extra_data.quizAnswers)).length : 0,
            total_game_responses: gameCount
          };
        } else if (stageFilter === 2) {
          // Etapa 3 - Currículo: dragDropResults, transformResults, resumeQuality
          let totalResumeQuality = 0;
          let resumeQualityCount = 0;
          let totalDragDropCorrect = 0;
          let dragDropCount = 0;
          
          extraDataRows.forEach(row => {
            const data = typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data;
            
            if (data.resumeQuality) {
              totalResumeQuality += data.resumeQuality.score || data.resumeQuality || 0;
              resumeQualityCount++;
            }
            
            if (data.dragDropResults) {
              totalDragDropCorrect += data.dragDropResults.correct || 0;
              dragDropCount++;
            }
          });
          
          stageSpecificStats = {
            avg_resume_quality: resumeQualityCount > 0 ? totalResumeQuality / resumeQualityCount : null,
            avg_dragdrop_correct: dragDropCount > 0 ? totalDragDropCorrect / dragDropCount : null
          };
        } else if (stageFilter === 3) {
          // Etapa 4 - Vagas: keywordsResult, matchResult, quizResult
          let totalKeywords = 0;
          let keywordsCount = 0;
          let totalQuizScore = 0;
          let quizCount = 0;
          
          extraDataRows.forEach(row => {
            const data = typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data;
            
            if (data.keywordsResult) {
              totalKeywords += data.keywordsResult.found || data.keywordsResult.score || 0;
              keywordsCount++;
            }
            
            if (data.quizResult) {
              totalQuizScore += data.quizResult.score || data.quizResult.correct || 0;
              quizCount++;
            }
          });
          
          stageSpecificStats = {
            avg_keywords_found: keywordsCount > 0 ? totalKeywords / keywordsCount : null,
            avg_quiz_score: quizCount > 0 ? totalQuizScore / quizCount : null
          };
        } else if (stageFilter === 4) {
          // Etapa 5 - Comportamento: simulatorResult
          let totalSimulatorScore = 0;
          let simulatorCount = 0;
          
          extraDataRows.forEach(row => {
            const data = typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data;
            
            if (data.simulatorResult) {
              totalSimulatorScore += data.simulatorResult.score || 0;
              simulatorCount++;
            }
          });
          
          stageSpecificStats = {
            avg_simulator_score: simulatorCount > 0 ? totalSimulatorScore / simulatorCount : null
          };
        } else if (stageFilter === 5) {
          // Etapa 6 - Entrevista: practiceResult
          let totalPracticeScore = 0;
          let practiceCount = 0;
          
          extraDataRows.forEach(row => {
            const data = typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data;
            
            if (data.practiceResult) {
              totalPracticeScore += data.practiceResult.score || 0;
              practiceCount++;
            }
          });
          
          stageSpecificStats = {
            avg_practice_score: practiceCount > 0 ? totalPracticeScore / practiceCount : null
          };
        } else if (stageFilter === 6) {
          // Etapa 7 - Pós-Entrevista: quizResult, orderingResult
          let totalQuizScore = 0;
          let quizCount = 0;
          let totalOrderingScore = 0;
          let orderingCount = 0;
          
          extraDataRows.forEach(row => {
            const data = typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data;
            
            if (data.quizResult) {
              totalQuizScore += data.quizResult.score || data.quizResult.correct || 0;
              quizCount++;
            }
            
            if (data.orderingResult) {
              totalOrderingScore += data.orderingResult.score || data.orderingResult.correct || 0;
              orderingCount++;
            }
          });
          
          stageSpecificStats = {
            avg_quiz_score: quizCount > 0 ? totalQuizScore / quizCount : null,
            avg_ordering_score: orderingCount > 0 ? totalOrderingScore / orderingCount : null
          };
        }
      }
    }
    
    console.log('📊 Journey stats calculado - total:', total, 'stageCounts:', stageCounts, 'stageFilter:', stageFilter);
    console.log('📊 Responses encontradas:', responses.rowCount);
    console.log('📊 Stage specific stats:', stageSpecificStats);
    
    // Mesclar stats gerais com stats específicos da etapa
    const mergedStats = {
      ...stats.rows[0],
      ...stageSpecificStats
    };
    
    res.json({
      total,
      stageCounts, // Contagem de alunos por etapa
      currentStage: stageFilter, // Etapa atual sendo filtrada (null = visão geral)
      responses: responses.rows,
      stats: mergedStats,
      workPreference: workPreference.rows,
      nervosismoDistribution: nervosismoDistribution.rows,
      preparacaoDistribution: preparacaoDistribution.rows
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas da jornada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/journey/school/overview - Visão geral da escola
router.get('/school/overview', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'school' && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const schoolId = req.user.id;

    // Total de alunos que completaram etapa 0
    const totals = await pool.query(`
      SELECT 
        COUNT(DISTINCT jr.user_id) as total_completed_stage0,
        AVG(jr.nervoso) as avg_nervoso,
        AVG(jr.preparado_entrevista) as avg_preparado_entrevista,
        AVG(jr.preparado_vaga) as avg_preparado_vaga,
        AVG(jr.interview_score::float / NULLIF(jr.interview_max_score, 0) * 100) as avg_interview_percentage
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.school_id = $1 AND jr.stage_id = 0
    `, [schoolId]);

    // Distribuição por nível de entrevista
    const levelDistribution = await pool.query(`
      SELECT 
        jr.interview_level,
        COUNT(*) as count
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.school_id = $1 AND jr.stage_id = 0 AND jr.interview_level IS NOT NULL
      GROUP BY jr.interview_level
    `, [schoolId]);

    // Preferência de quando trabalhar (geral da escola)
    const workPreference = await pool.query(`
      SELECT 
        quando_trabalhar_text,
        COUNT(*) as count
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.school_id = $1 AND jr.stage_id = 0 AND jr.quando_trabalhar_text IS NOT NULL
      GROUP BY quando_trabalhar_text, quando_trabalhar_value
      ORDER BY quando_trabalhar_value
    `, [schoolId]);

    res.json({
      totals: totals.rows[0],
      levelDistribution: levelDistribution.rows,
      workPreference: workPreference.rows
    });
  } catch (error) {
    console.error('Erro ao obter visão geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
