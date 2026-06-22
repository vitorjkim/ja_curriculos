import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/messages - buscar mensagens do candidato
router.get('/', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.user.id;

    const query = `
      SELECT 
        cm.*,
        u.company_name,
        u.name as company_name_fallback,
        j.title as job_title
      FROM candidate_messages cm
      LEFT JOIN users u ON cm.company_id = u.id
      LEFT JOIN jobs j ON cm.job_id = j.id
      WHERE cm.candidate_id = $1
      ORDER BY cm.created_at DESC
    `;

    const result = await pool.query(query, [candidateId]);

    const messages = result.rows.map(row => ({
      id: row.id,
      messageType: row.message_type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at,
      companyId: row.company_id,
      jobId: row.job_id,
      companyName: row.company_name || row.company_name_fallback,
      jobTitle: row.job_title
    }));

    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/messages/:id/read - marcar mensagem como lida
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.user.id;
    const messageId = req.params.id;

    const query = `
      UPDATE candidate_messages 
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND candidate_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [messageId, candidateId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    res.json({ success: true, message: 'Mensagem marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/messages/unread-count - contar mensagens não lidas
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.user.id;

    const query = `
      SELECT COUNT(*) as count
      FROM candidate_messages
      WHERE candidate_id = $1 AND is_read = false
    `;

    const result = await pool.query(query, [candidateId]);
    const count = parseInt(result.rows[0].count);

    res.json({ count });
  } catch (error) {
    console.error('Erro ao contar mensagens não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
