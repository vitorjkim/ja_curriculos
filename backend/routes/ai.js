/**
 * AI Routes - Resume Analysis, Rewriting, and Job Matching
 * Integrates with AI services to analyze resumes and calculate matching scores
 * 
 * Base path: /api/ai
 */

import express from 'express';
import { param, body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
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

export default router;
