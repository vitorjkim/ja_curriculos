import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireCompany } from '../middleware/auth.js';

const router = express.Router();

// GET /api/favorites/company - list favorites for the authenticated company
router.get('/company', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const query = `
            SELECT f.id, f.company_id, f.candidate_id, f.job_id, f.created_at,
              u.email AS candidate_email, u.name AS candidate_name,
              u.profile_image AS candidate_profile_image,
             r.id AS resume_id, r.original_file_name AS resume_filename,
             j.title AS job_title
      FROM favorites f
      JOIN users u ON u.id = f.candidate_id
      LEFT JOIN resumes r ON r.user_id = f.candidate_id
      LEFT JOIN jobs j ON j.id = f.job_id
      WHERE f.company_id = $1
      ORDER BY f.created_at DESC
    `;
    const { rows } = await pool.query(query, [companyId]);
    res.json({ favorites: rows });
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/favorites - add a favorite
router.post('/', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const { candidateId, jobId } = req.body;
    const insert = `INSERT INTO favorites(company_id, candidate_id, job_id) VALUES($1, $2, $3) RETURNING *`;
    const { rows } = await pool.query(insert, [companyId, candidateId, jobId]);
    res.status(201).json({ favorite: rows[0] });
  } catch (error) {
    console.error('Erro ao criar favorito:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/favorites/:id - remove a favorite
router.delete('/:id', authenticateToken, requireCompany, async (req, res) => {
  try {
    const companyId = req.user.id;
    const favId = req.params.id;
    const del = `DELETE FROM favorites WHERE id = $1 AND company_id = $2 RETURNING *`;
    const { rows } = await pool.query(del, [favId, companyId]);
    if (!rows.length) return res.status(404).json({ error: 'Favorito não encontrado', code: 'NOT_FOUND' });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

export default router;
