// Rotas para vagas salvas
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/saved-jobs - Listar vagas salvas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT sj.id, sj.job_id, sj.created_at as saved_at,
              j.title, j.location, j.contract_type, j.work_type,
              u.company_name, u.profile_image as company_logo
       FROM saved_jobs sj
       JOIN jobs j ON j.id = sj.job_id
       LEFT JOIN users u ON j.company_id = u.id
       WHERE sj.user_id = $1
       ORDER BY sj.created_at DESC`,
      [userId]
    );
    
    // Mapear para formato compatível com o frontend
    const jobs = result.rows.map(row => ({
      id: row.job_id,
      title: row.title,
      company_name: row.company_name || 'Empresa',
      company_logo: row.company_logo || null,
      location: row.location,
      contract_type: row.contract_type,
      work_type: row.work_type,
      savedAt: new Date(row.saved_at).getTime()
    }));
    
    res.json(jobs);
  } catch (error) {
    console.error('Erro ao listar vagas salvas:', error);
    res.status(500).json({ error: 'Erro ao listar vagas salvas' });
  }
});

// GET /api/saved-jobs/ids - Listar apenas IDs das vagas salvas
router.get('/ids', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT job_id FROM saved_jobs WHERE user_id = $1',
      [userId]
    );
    
    const ids = result.rows.map(row => row.job_id);
    res.json(ids);
  } catch (error) {
    console.error('Erro ao listar IDs de vagas salvas:', error);
    res.status(500).json({ error: 'Erro ao listar IDs de vagas salvas' });
  }
});

// POST /api/saved-jobs/:jobId - Salvar uma vaga
router.post('/:jobId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.jobId;
    
    // Verificar se a vaga existe
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    
    // Inserir (ignorar se já existe)
    await pool.query(
      `INSERT INTO saved_jobs (user_id, job_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, job_id) DO NOTHING`,
      [userId, jobId]
    );
    
    res.status(201).json({ success: true, message: 'Vaga salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar vaga:', error);
    res.status(500).json({ error: 'Erro ao salvar vaga' });
  }
});

// DELETE /api/saved-jobs/:jobId - Remover vaga salva
router.delete('/:jobId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.jobId;
    
    await pool.query(
      'DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );
    
    res.json({ success: true, message: 'Vaga removida dos salvos' });
  } catch (error) {
    console.error('Erro ao remover vaga salva:', error);
    res.status(500).json({ error: 'Erro ao remover vaga salva' });
  }
});

export default router;
