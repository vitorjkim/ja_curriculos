/**
 * AI Routes - Resume Analysis, Rewriting, and Job Matching
 * Integrates with AI services to analyze resumes and calculate matching scores
 * 
 * Base path: /api/ai
 */

import express from 'express';
import { param, body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, requireCompany } from '../middleware/auth.js';
import { requirePremiumPlan } from '../middleware/checkSubscriptionPlan.js';
import aiService from '../services/aiService.js';
import matchingService from '../services/matchingService.js';

const router = express.Router();

// ============================================================================
// RESUME ANALYSIS ENDPOINTS
// ============================================================================

/**
 * POST /api/ai/analyze-resume/:id
 * Analyze a resume and calculate quality score
 * Returns: { score, explanation, strengths, improvements, suggestions }
 * ⚠️ PREMIUM PLAN REQUIRED
 */
router.post(
  '/analyze-resume/:id',
  authenticateToken,
  requirePremiumPlan,
  [param('id').isUUID('all')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get resume from database
      const resumeResult = await pool.query(
        `SELECT * FROM resumes WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (resumeResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Resume not found',
          code: 'RESUME_NOT_FOUND',
        });
      }

      const resume = resumeResult.rows[0];

      // Check if analysis already exists and is recent (less than 30 days)
      if (resume.quality_score !== null && resume.analyzed_at) {
        const daysSinceAnalysis = Math.floor(
          (Date.now() - new Date(resume.analyzed_at)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceAnalysis < 30) {
          return res.json({
            cached: true,
            daysSinceAnalysis,
            score: resume.quality_score,
            scoreExplanation: resume.score_explanation,
            strengths: resume.ai_strengths,
            improvements: resume.ai_improvements,
            missingKeywords: resume.missing_keywords,
            recommendations: resume.recommendations,
            suggestedCourses: resume.suggested_courses,
            summary: resume.analysis_summary,
          });
        }
      }

      // Perform new analysis
      const analysis = await aiService.analyzeResume(resume);

      // Store analysis in database
      await pool.query(
        `UPDATE resumes SET 
          quality_score = $1,
          score_explanation = $2,
          ai_strengths = $3,
          ai_improvements = $4,
          missing_keywords = $5,
          recommendations = $6,
          suggested_courses = $7,
          analysis_summary = $8,
          analyzed_at = CURRENT_TIMESTAMP
        WHERE id = $9`,
        [
          analysis.score,
          analysis.scoreExplanation,
          JSON.stringify(analysis.strengths),
          JSON.stringify(analysis.improvements),
          JSON.stringify(analysis.missingKeywords),
          JSON.stringify(analysis.recommendations),
          JSON.stringify(analysis.suggestedCourses),
          analysis.summary,
          id,
        ]
      );

      // Save to history
      await pool.query(
        `INSERT INTO resume_analysis_history 
        (resume_id, quality_score, score_explanation, strengths, improvements, missing_keywords, recommendations, suggested_courses, analysis_summary, ai_provider)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          analysis.score,
          analysis.scoreExplanation,
          JSON.stringify(analysis.strengths),
          JSON.stringify(analysis.improvements),
          JSON.stringify(analysis.missingKeywords),
          JSON.stringify(analysis.recommendations),
          JSON.stringify(analysis.suggestedCourses),
          analysis.summary,
          process.env.AI_PROVIDER || 'openai',
        ]
      );

      res.json({
        success: true,
        cached: false,
        score: analysis.score,
        scoreExplanation: analysis.scoreExplanation,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        missingKeywords: analysis.missingKeywords,
        recommendations: analysis.recommendations,
        suggestedCourses: analysis.suggestedCourses,
        summary: analysis.summary,
      });
    } catch (error) {
      console.error('Error analyzing resume:', error);
      res.status(500).json({
        error: 'Failed to analyze resume',
        details: error.message,
        code: 'ANALYSIS_FAILED',
      });
    }
  }
);

/**
 * GET /api/ai/resume-analysis/:id
 * Get cached analysis without rerunning
 */
router.get(
  '/resume-analysis/:id',
  authenticateToken,
  [param('id').isUUID('all')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT 
          quality_score,
          score_explanation,
          ai_strengths,
          ai_improvements,
          missing_keywords,
          recommendations,
          suggested_courses,
          analysis_summary,
          analyzed_at
        FROM resumes 
        WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Resume not found',
          code: 'RESUME_NOT_FOUND',
        });
      }

      const analysis = result.rows[0];

      if (!analysis.quality_score) {
        return res.status(404).json({
          error: 'No analysis available. Please analyze the resume first.',
          code: 'NO_ANALYSIS',
        });
      }

      res.json({
        score: analysis.quality_score,
        scoreExplanation: analysis.score_explanation,
        strengths: analysis.ai_strengths,
        improvements: analysis.ai_improvements,
        missingKeywords: analysis.missing_keywords,
        recommendations: analysis.recommendations,
        suggestedCourses: analysis.suggested_courses,
        summary: analysis.analysis_summary,
        analyzedAt: analysis.analyzed_at,
      });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({
        error: 'Failed to fetch analysis',
        code: 'FETCH_FAILED',
      });
    }
  }
);

// ============================================================================
// TEXT REWRITING ENDPOINTS
// ============================================================================

/**
 * POST /api/ai/rewrite-text
 * Rewrite a section of experience/education/summary text
 * Body: { text, context: 'experience|education|summary' }
 * ⚠️ PREMIUM PLAN REQUIRED
 */
router.post(
  '/rewrite-text',
  authenticateToken,
  requirePremiumPlan,
  [body('text').trim().notEmpty(), body('context').isIn(['experience', 'education', 'summary'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { text, context } = req.body;

      const result = await aiService.rewriteText(text, context);

      res.json({
        success: true,
        original: text,
        rewrittenText: result.rewrittenText,
        tips: result.tips,
      });
    } catch (error) {
      console.error('Error rewriting text:', error);
      res.status(500).json({
        error: 'Failed to rewrite text',
        details: error.message,
        code: 'REWRITE_FAILED',
      });
    }
  }
);

// ============================================================================
// SKILL RECOMMENDATIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/ai/skill-recommendations/:id
 * Get skill and course recommendations for a job title
 * Body: { jobTitle } (optional: { skills } to override current skills)
 * ⚠️ PREMIUM PLAN REQUIRED
 */
router.post(
  '/skill-recommendations/:id',
  authenticateToken,
  requirePremiumPlan,
  [param('id').isUUID('all'), body('jobTitle').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { jobTitle, skills } = req.body;
      const userId = req.user.id;

      // Get resume
      const resumeResult = await pool.query(
        `SELECT skills FROM resumes WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (resumeResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Resume not found',
          code: 'RESUME_NOT_FOUND',
        });
      }

      const currentSkills =
        skills || resumeResult.rows[0].skills || [];

      const recommendations = await aiService.getSkillRecommendations(
        jobTitle,
        currentSkills
      );

      res.json({
        success: true,
        jobTitle,
        currentSkills,
        recommendations,
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        error: 'Failed to get recommendations',
        details: error.message,
        code: 'RECOMMENDATIONS_FAILED',
      });
    }
  }
);

// ============================================================================
// MATCHING & RANKING ENDPOINTS
// ============================================================================

/**
 * POST /api/ai/calculate-matching
 * Calculate matching score for a specific application
 * Body: { applicationId } or { jobId, resumeId }
 */
router.post(
  '/calculate-matching',
  authenticateToken,
  async (req, res) => {
    try {
      const { applicationId, jobId, resumeId } = req.body;
      const userId = req.user.id;

      let application, job, resume;

      if (applicationId) {
        // Get from application
        const appResult = await pool.query(
          `SELECT a.*, j.id as job_id, r.id as resume_id
           FROM applications a
           JOIN jobs j ON a.job_id = j.id
           JOIN resumes r ON a.resume_id = r.id
           WHERE a.id = $1`,
          [applicationId]
        );

        if (appResult.rows.length === 0) {
          return res.status(404).json({ error: 'Application not found' });
        }

        application = appResult.rows[0];
        jobId = application.job_id;
        resumeId = application.resume_id;
      }

      // Get job and resume
      const [jobResult, resumeResult] = await Promise.all([
        pool.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]),
        pool.query(`SELECT * FROM resumes WHERE id = $1`, [resumeId]),
      ]);

      if (jobResult.rows.length === 0 || resumeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job or resume not found' });
      }

      job = jobResult.rows[0];
      resume = resumeResult.rows[0];

      // Calculate matching
      const matching = matchingService.calculateMatchingScore(job, resume);

      // Store if applicationId provided
      if (applicationId) {
        await pool.query(
          `UPDATE applications SET 
            matching_score = $1,
            matching_details = $2
           WHERE id = $3`,
          [
            matching.score,
            JSON.stringify(matching.details),
            applicationId,
          ]
        );

        // Update ranking for all applications on this job
        await pool.query(
          `SELECT update_ranking_positions($1::uuid)`,
          [jobId]
        );
      }

      res.json({
        success: true,
        score: matching.score,
        details: matching.details,
        explanation: matching.explanation,
        breakdownPercentages: matching.breakdownPercentages,
      });
    } catch (error) {
      console.error('Error calculating matching:', error);
      res.status(500).json({
        error: 'Failed to calculate matching',
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/ai/job-ranking/:jobId
 * Get ranked list of candidates for a job
 * Only accessible to company or admin
 */
router.get(
  '/job-ranking/:jobId',
  authenticateToken,
  [param('jobId').isUUID('all')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { jobId } = req.params;
      const userId = req.user.id;

      // Verify job ownership (company or admin)
      const jobResult = await pool.query(
        `SELECT company_id FROM jobs WHERE id = $1`,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobResult.rows[0];

      if (job.company_id !== userId && req.user.type !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get all applications with matching scores, ranked
      const result = await pool.query(
        `SELECT 
          a.id,
          a.candidate_id,
          a.resume_id,
          a.status,
          a.matching_score,
          a.matching_details,
          a.ranking_position,
          u.name,
          u.email,
          r.title as resume_title
        FROM applications a
        JOIN users u ON a.candidate_id = u.id
        JOIN resumes r ON a.resume_id = r.id
        WHERE a.job_id = $1
        ORDER BY a.ranking_position ASC NULLS LAST`,
        [jobId]
      );

      const candidates = result.rows.map((row, idx) => ({
        ranking: row.ranking_position || idx + 1,
        ...row,
      }));

      res.json({
        success: true,
        jobId,
        totalCandidates: candidates.length,
        candidates,
      });
    } catch (error) {
      console.error('Error fetching ranking:', error);
      res.status(500).json({
        error: 'Failed to fetch ranking',
        code: 'RANKING_FAILED',
      });
    }
  }
);

/**
 * POST /api/ai/recalculate-job-matching/:jobId
 * Recalculate matching for ALL applications on a job
 * Useful after job description changes
 * Only accessible to company or admin
 */
router.post(
  '/recalculate-job-matching/:jobId',
  authenticateToken,
  [param('jobId').isUUID('all')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { jobId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const jobResult = await pool.query(
        `SELECT * FROM jobs WHERE id = $1`,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobResult.rows[0];

      if (job.company_id !== userId && req.user.type !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get all applications for this job
      const applicationsResult = await pool.query(
        `SELECT a.id, a.resume_id FROM applications WHERE job_id = $1`,
        [jobId]
      );

      if (applicationsResult.rows.length === 0) {
        return res.json({ success: true, updatedCount: 0 });
      }

      // Get all resumes
      const resumeIds = applicationsResult.rows.map((a) => a.resume_id);
      const resumesResult = await pool.query(
        `SELECT * FROM resumes WHERE id = ANY($1)`,
        [resumeIds]
      );

      const resumeMap = {};
      resumesResult.rows.forEach((r) => {
        resumeMap[r.id] = r;
      });

      // Calculate all matching scores
      let updateCount = 0;

      for (const app of applicationsResult.rows) {
        const resume = resumeMap[app.resume_id];
        if (!resume) continue;

        const matching = matchingService.calculateMatchingScore(job, resume);

        await pool.query(
          `UPDATE applications SET 
            matching_score = $1,
            matching_details = $2
           WHERE id = $3`,
          [
            matching.score,
            JSON.stringify(matching.details),
            app.id,
          ]
        );

        updateCount++;
      }

      // Update all ranking positions
      await pool.query(`SELECT update_ranking_positions($1::uuid)`, [jobId]);

      res.json({
        success: true,
        jobId,
        updatedCount,
        message: `Recalculated matching scores for ${updateCount} applications`,
      });
    } catch (error) {
      console.error('Error calculating all matching:', error);
      res.status(500).json({
        error: 'Failed to calculate matching',
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/ai/generate-job-keywords
 * Gera sugestões de palavras-chave para uma vaga com base nos dados já preenchidos pela empresa
 * Usado no formulário de criação/edição de vaga (botão "Gerar palavras-chave com IA")
 */
router.post(
  '/generate-job-keywords',
  authenticateToken,
  requireCompany,
  [
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('requirements').optional().isString(),
    body('benefits').optional().isString(),
    body('area').optional().isString(),
    body('subarea').optional().isString(),
    body('contract_type').optional().isString(),
    body('experience_level').optional().isString(),
    body('work_type').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const keywords = await aiService.suggestJobKeywords(req.body);
      res.json({ success: true, keywords });
    } catch (error) {
      console.error('Erro ao gerar palavras-chave da vaga:', error.message);
      res.status(500).json({
        error: 'Falha ao gerar palavras-chave',
        details: error.message,
        code: 'JOB_KEYWORDS_FAILED',
      });
    }
  }
);

/**
 * POST /api/ai/analyze-candidate-fit
 * Análise completa de compatibilidade de candidato com vaga
 * Retorna: score, resumo, motivos do score (strengths/gaps), e possíveis riscos
 * Usado no card de candidatos para exibir compatibilidade
 */
router.post(
  '/analyze-candidate-fit',
  authenticateToken,
  requireCompany,
  [
    body('applicationId').optional().isUUID('all'),
    body('jobId').optional().isUUID('all'),
    body('resumeId').optional().isUUID('all'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { applicationId, jobId, resumeId } = req.body;
      const userId = req.user.id;

      let application, job, resume;

      if (applicationId) {
        // Get from application
        const appResult = await pool.query(
          `SELECT a.*, j.id as job_id, j.title, j.description, j.requirements, 
                  j.benefits, j.location, j.work_type, j.contract_type, j.experience_level,
                  j.area, j.subarea, j.keywords, r.id as resume_id
           FROM applications a
           JOIN jobs j ON a.job_id = j.id
           JOIN resumes r ON a.resume_id = r.id
           WHERE a.id = $1 AND j.company_id = $2`,
          [applicationId, userId]
        );

        if (appResult.rows.length === 0) {
          return res.status(403).json({ error: 'Application not found or access denied' });
        }

        application = appResult.rows[0];
        jobId = application.job_id;
        resumeId = application.resume_id;
        job = {
          id: application.job_id,
          title: application.title,
          description: application.description,
          requirements: application.requirements,
          benefits: application.benefits,
          location: application.location,
          work_type: application.work_type,
          contract_type: application.contract_type,
          experience_level: application.experience_level,
          area: application.area,
          subarea: application.subarea,
          keywords: application.keywords,
        };
      } else if (jobId && resumeId) {
        // Get both separately
        const [jobResult, resumeResult] = await Promise.all([
          pool.query(
            `SELECT * FROM jobs WHERE id = $1 AND company_id = $2`,
            [jobId, userId]
          ),
          pool.query(`SELECT * FROM resumes WHERE id = $1`, [resumeId]),
        ]);

        if (jobResult.rows.length === 0 || resumeResult.rows.length === 0) {
          return res.status(404).json({ error: 'Job or resume not found' });
        }

        job = jobResult.rows[0];
      } else {
        return res.status(400).json({ 
          error: 'Either applicationId or both jobId and resumeId must be provided' 
        });
      }

      // Get resume
      if (!resume) {
        const resumeResult = await pool.query(
          `SELECT * FROM resumes WHERE id = $1`,
          [resumeId]
        );
        if (resumeResult.rows.length === 0) {
          return res.status(404).json({ error: 'Resume not found' });
        }
        resume = resumeResult.rows[0];
      }

      // Formatar dados para análise
      const resumeText = formatResumeForAI(resume);
      const jobText = formatJobForAI(job);

      // Calcular matching detalhado via IA
      let detailedAnalysis = null;
      try {
        detailedAnalysis = await aiService.calculateJobMatch(resumeText, jobText);
      } catch (aiError) {
        console.warn('IA analysis fallback:', aiError.message);
        // Fallback para análise simples se IA falhar
        detailedAnalysis = null;
      }

      // Analisar riscos no currículo
      const risks = analyzeResumesRisks(resume);

      // Gerar resumo automático
      const summary = generateAutoSummary(
        job,
        resume,
        detailedAnalysis,
        risks
      );

      // Formatar resposta
      const response = {
        success: true,
        candidateId: resume.user_id,
        applicationId: application?.id,
        matchingScore: detailedAnalysis?.matchScore || 0,
        summary,
        scoreBreakdown: detailedAnalysis ? {
          strengths: detailedAnalysis.strengths || [],
          gaps: detailedAnalysis.gaps || [],
          improvements: detailedAnalysis.improvementSuggestions || [],
        } : { strengths: [], gaps: [], improvements: [] },
        risks,
      };

      res.json(response);
    } catch (error) {
      console.error('Error analyzing candidate fit:', error);
      res.status(500).json({
        error: 'Failed to analyze candidate fit',
        details: error.message,
      });
    }
  }
);

/**
 * Formatar currículo para análise de IA
 */
function formatResumeForAI(resume) {
  const lines = [];
  
  if (resume.name) lines.push(`Nome: ${resume.name}`);
  if (resume.phone) lines.push(`Telefone: ${resume.phone}`);
  if (resume.email) lines.push(`Email: ${resume.email}`);
  
  if (resume.personal_info) {
    const pi = resume.personal_info;
    if (pi.location) lines.push(`Localização: ${pi.location}`);
    if (pi.expectedSalary) lines.push(`Salário esperado: R$ ${pi.expectedSalary}`);
    if (pi.preferredContractTypes) lines.push(`Tipos de contrato preferidos: ${pi.preferredContractTypes.join(', ')}`);
  }

  if (resume.summary) lines.push(`\nResumo: ${resume.summary}`);

  if (resume.experience && resume.experience.length > 0) {
    lines.push('\nExperiência Profissional:');
    resume.experience.forEach(exp => {
      lines.push(`- ${exp.jobTitle} na ${exp.company} (${exp.startDate} a ${exp.endDate || 'Atual'})`);
      if (exp.description) lines.push(`  ${exp.description}`);
    });
  }

  if (resume.education && resume.education.length > 0) {
    lines.push('\nEducação:');
    resume.education.forEach(edu => {
      lines.push(`- ${edu.degree} em ${edu.fieldOfStudy} pela ${edu.institution}`);
      if (edu.startDate) lines.push(`  (${edu.startDate} - ${edu.endDate || 'Atual'})`);
    });
  }

  if (resume.skills && resume.skills.length > 0) {
    lines.push(`\nHabilidades: ${resume.skills.join(', ')}`);
  }

  if (resume.languages && resume.languages.length > 0) {
    lines.push('\nIdiomas:');
    resume.languages.forEach(lang => {
      lines.push(`- ${lang.name} (${lang.proficiency})`);
    });
  }

  if (resume.certifications && resume.certifications.length > 0) {
    lines.push('\nCertificações:');
    resume.certifications.forEach(cert => {
      lines.push(`- ${cert.name} (${cert.issuer})`);
    });
  }

  return lines.join('\n');
}

/**
 * Formatar vaga para análise de IA
 */
function formatJobForAI(job) {
  const lines = [];
  
  if (job.title) lines.push(`Título: ${job.title}`);
  if (job.area) lines.push(`Área: ${job.area}${job.subarea ? ` - ${job.subarea}` : ''}`);
  if (job.location) lines.push(`Localização: ${job.location}`);
  if (job.work_type) lines.push(`Tipo de trabalho: ${job.work_type}`);
  if (job.contract_type) lines.push(`Tipo de contrato: ${job.contract_type}`);
  if (job.experience_level) lines.push(`Nível de experiência: ${job.experience_level}`);

  if (job.description) lines.push(`\nDescrição: ${job.description}`);
  if (job.requirements) lines.push(`\nRequisitos: ${job.requirements}`);
  if (job.benefits) lines.push(`\nBenefícios: ${job.benefits}`);
  if (job.keywords) lines.push(`\nPalavras-chave: ${job.keywords}`);

  return lines.join('\n');
}

/**
 * Analisar possíveis riscos no currículo
 */
function analyzeResumesRisks(resume) {
  const risks = [];

  // Analisar mudanças de emprego frequentes
  if (resume.experience && resume.experience.length >= 5) {
    const lastFourYears = resume.experience.filter(exp => {
      const startDate = new Date(exp.startDate);
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
      return startDate >= fourYearsAgo;
    });
    
    if (lastFourYears.length >= 4) {
      const months = lastFourYears.reduce((acc, exp) => {
        const start = new Date(exp.startDate);
        const end = new Date(exp.endDate || new Date());
        return acc + (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      }, 0);
      
      if (months < 48) { // Menos de 4 anos trabalhando em 4+ empregos
        risks.push({
          icon: '⚠️',
          title: 'Rotatividade de Emprego',
          description: `Mudou de emprego ${lastFourYears.length} vezes em ${Math.round(months / 12)} anos.`,
          severity: 'medium',
        });
      }
    }
  }

  // Analisar lacunas no currículo
  if (resume.experience && resume.experience.length >= 2) {
    let maxGap = 0;
    for (let i = 0; i < resume.experience.length - 1; i++) {
      const end = new Date(resume.experience[i].endDate || new Date());
      const start = new Date(resume.experience[i + 1].startDate);
      const gap = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30)); // em meses
      if (gap > maxGap) maxGap = gap;
    }
    
    if (maxGap >= 6) {
      risks.push({
        icon: '⏸️',
        title: 'Lacunas no Currículo',
        description: `Identificada lacuna de ${maxGap} meses entre empregos.`,
        severity: 'low',
      });
    }
  }

  // Analisar idiomas não informados
  if (!resume.languages || resume.languages.length === 0) {
    risks.push({
      icon: '🌐',
      title: 'Idiomas Não Informados',
      description: 'O nível de inglês não foi informado no currículo.',
      severity: 'low',
    });
  }

  // Analisar educação incompleta
  if (!resume.education || resume.education.length === 0) {
    risks.push({
      icon: '🎓',
      title: 'Educação Não Informada',
      description: 'Nenhuma formação educacional foi registrada no currículo.',
      severity: 'low',
    });
  }

  return risks;
}

/**
 * Gerar resumo automático da compatibilidade
 */
function generateAutoSummary(job, resume, detailedAnalysis, risks) {
  const lines = [];

  if (detailedAnalysis) {
    const score = detailedAnalysis.matchScore || 0;
    
    if (score >= 80) {
      lines.push(`Excelente compatibilidade (${score}%). ${resume.name} possui a maioria das habilidades e experiências necessárias.`);
    } else if (score >= 60) {
      lines.push(`Boa compatibilidade (${score}%). ${resume.name} tem várias habilidades relevantes, mas poderia fortalecer algumas áreas.`);
    } else if (score >= 40) {
      lines.push(`Compatibilidade moderada (${score}%). ${resume.name} tem alguns requisitos, mas precisaria desenvolver novas competências.`);
    } else {
      lines.push(`Compatibilidade baixa (${score}%). Este perfil requer maiores desenvolvimentos para se encaixar na vaga.`);
    }

    // Adicionar força principal
    if (detailedAnalysis.strengths && detailedAnalysis.strengths.length > 0) {
      lines.push(`Ponto forte: ${detailedAnalysis.strengths[0].keyword}.`);
    }

    // Adicionar gap principal
    if (detailedAnalysis.gaps && detailedAnalysis.gaps.length > 0) {
      lines.push(`Área para desenvolvimento: ${detailedAnalysis.gaps[0].keyword}.`);
    }
  } else {
    lines.push(`Candidato: ${resume.name}. Vaga: ${job.title}.`);
  }

  // Mencionar riscos se houver
  if (risks && risks.length > 0) {
    const highRisks = risks.filter(r => r.severity === 'high');
    if (highRisks.length > 0) {
      lines.push(`Atenção: ${highRisks.length} risco(s) importante(s) identificado(s).`);
    }
  }

  return lines.slice(0, 5).join(' '); // Retornar até 5 linhas
}

export default router;
