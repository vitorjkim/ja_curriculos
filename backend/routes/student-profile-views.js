import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register a profile view (company only)
router.post('/:id/profile-view', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ success: false, message: 'Apenas empresas registram visualizações' });
    }
    const { id } = req.params; // student id
    // Ensure target is a candidate
    const u = await pool.query('SELECT id, type FROM users WHERE id=$1', [id]);
    if (u.rows.length === 0) return res.status(404).json({ success:false, message:'Aluno não encontrado' });
    if (u.rows[0].type !== 'candidate') return res.status(400).json({ success:false, message:'Usuário não é aluno' });

    await pool.query(`
      INSERT INTO student_profile_views (student_id, company_id, viewed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (student_id, company_id)
      DO UPDATE SET viewed_at = EXCLUDED.viewed_at
    `, [id, req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/students/:id/profile-view error', e);
    res.status(500).json({ success:false, message:'Erro ao registrar visualização' });
  }
});

// Get profile views stats (student self or school)
router.get('/:id/profile-views', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // student id
    // Permissions: student self, school, or admin
    if (!(req.user.id === id && req.user.type === 'candidate') && req.user.type !== 'school' && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Sem permissão' });
    }
    const q = `
      SELECT v.company_id, v.viewed_at,
             COALESCE(NULLIF(u.company_name,''), NULLIF(u.name,''), u.email) AS display_name,
             u.profile_image AS avatar
      FROM student_profile_views v
      JOIN users u ON u.id = v.company_id
      WHERE v.student_id = $1
      ORDER BY v.viewed_at DESC
    `;
    const r = await pool.query(q, [id]);
    const companies = r.rows.map(row => ({ id: row.company_id, name: row.display_name, viewed_at: row.viewed_at, avatar: row.avatar }));
    res.json({ success:true, count: companies.length, companies });
  } catch (e) {
    console.error('GET /api/students/:id/profile-views error', e);
    res.status(500).json({ success:false, message:'Erro ao obter visualizações' });
  }
});

export default router;
