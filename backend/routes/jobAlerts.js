// Rotas para alertas de vagas
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/job-alerts - Listar alertas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, name, filters, active, created_at, updated_at 
       FROM job_alerts 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro ao listar alertas' });
  }
});

// POST /api/job-alerts - Criar novo alerta
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, filters } = req.body;
    
    // Validar filtros
    const safeFilters = {
      location: filters?.location || '',
      contract_type: filters?.contract_type || 'Todos',
      work_type: filters?.work_type || 'Todos',
      experience_level: filters?.experience_level || 'Todos',
      area: filters?.area || 'Todos',
      subarea: filters?.subarea || 'Todos'
    };
    
    const result = await pool.query(
      `INSERT INTO job_alerts (user_id, name, filters, active) 
       VALUES ($1, $2, $3, true) 
       RETURNING id, name, filters, active, created_at, updated_at`,
      [userId, name || 'Minha busca', JSON.stringify(safeFilters)]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    res.status(500).json({ error: 'Erro ao criar alerta' });
  }
});

// PATCH /api/job-alerts/:id - Atualizar alerta (toggle active, etc)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.id;
    const { name, filters, active } = req.body;
    
    // Verificar se o alerta pertence ao usuário
    const check = await pool.query(
      'SELECT id FROM job_alerts WHERE id = $1 AND user_id = $2',
      [alertId, userId]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    // Construir query de update dinamicamente
    const updates = [];
    const values = [];
    let idx = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (filters !== undefined) {
      updates.push(`filters = $${idx++}`);
      values.push(JSON.stringify(filters));
    }
    if (active !== undefined) {
      updates.push(`active = $${idx++}`);
      values.push(active);
    }
    updates.push(`updated_at = NOW()`);
    
    values.push(alertId);
    values.push(userId);
    
    const result = await pool.query(
      `UPDATE job_alerts 
       SET ${updates.join(', ')} 
       WHERE id = $${idx++} AND user_id = $${idx} 
       RETURNING id, name, filters, active, created_at, updated_at`,
      values
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
    res.status(500).json({ error: 'Erro ao atualizar alerta' });
  }
});

// DELETE /api/job-alerts/:id - Remover alerta
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.id;
    
    const result = await pool.query(
      'DELETE FROM job_alerts WHERE id = $1 AND user_id = $2 RETURNING id',
      [alertId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    res.json({ success: true, id: alertId });
  } catch (error) {
    console.error('Erro ao remover alerta:', error);
    res.status(500).json({ error: 'Erro ao remover alerta' });
  }
});

export default router;
