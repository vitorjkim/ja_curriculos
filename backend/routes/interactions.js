import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireCompany } from '../middleware/auth.js';

const router = express.Router();

// Lazy ensure tables (caso script SQL não tenha sido executado)
let ensuredInteractionTables = false;
const ensureInteractionTables = async () => {
  if (ensuredInteractionTables) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_interactions (
        id SERIAL PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('interested', 'not_profile', 'interview')),
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS candidate_messages (
        id SERIAL PRIMARY KEY,
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('resume_viewed', 'resume_downloaded', 'interaction')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP NULL
      );
  -- Garantir colunas se a tabela já existia sem elas
      ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50);
      ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS title VARCHAR(255);
      ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS message TEXT;
      ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS content TEXT; -- legado
      ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
      ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL;
      -- Tornar content e message opcionais para evitar erro de NOT NULL herdado
      DO $$ BEGIN
        BEGIN
          ALTER TABLE candidate_messages ALTER COLUMN content DROP NOT NULL;
        EXCEPTION WHEN undefined_column THEN END;
      END $$;
      DO $$ BEGIN
        BEGIN
          ALTER TABLE candidate_messages ALTER COLUMN message DROP NOT NULL;
        EXCEPTION WHEN undefined_column THEN END;
      END $$;
  ALTER TABLE company_interactions ADD COLUMN IF NOT EXISTS message TEXT;
      CREATE INDEX IF NOT EXISTS idx_company_interactions_company ON company_interactions(company_id);
      CREATE INDEX IF NOT EXISTS idx_company_interactions_candidate ON company_interactions(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_messages_candidate ON candidate_messages(candidate_id);
    `);
    ensuredInteractionTables = true;
  } catch (e) {
    console.error('Erro garantindo tabelas de interações:', e.message);
  }
};

// POST /api/interactions - create interaction and send message to candidate
router.post('/', authenticateToken, requireCompany, async (req, res) => {
  try {
  await ensureInteractionTables();
    const companyId = req.user.id;
    const { candidateId, jobId, interactionType, message } = req.body;

    // Validar interaction_type
    const validTypes = ['interested', 'not_profile', 'interview'];
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({ error: 'Tipo de interação inválido' });
    }

    // Buscar informações da empresa e vaga
    const companyQuery = await pool.query('SELECT name, company_name FROM users WHERE id = $1', [companyId]);
    const jobQuery = await pool.query('SELECT title FROM jobs WHERE id = $1', [jobId]);
    
    const companyName = companyQuery.rows[0]?.company_name || companyQuery.rows[0]?.name || 'Empresa';
    const jobTitle = jobQuery.rows[0]?.title || 'Vaga';

    // Criar interação
    const interactionQuery = `
      INSERT INTO company_interactions (company_id, candidate_id, job_id, interaction_type, message)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const interactionResult = await pool.query(interactionQuery, [companyId, candidateId, jobId, interactionType, message]);

    // Criar mensagem para o candidato
    let messageTitle, messageText;
    switch (interactionType) {
      case 'interested':
        messageTitle = '🎯 Empresa demonstrou interesse!';
        messageText = `A empresa ${companyName} demonstrou interesse no seu perfil para a vaga "${jobTitle}".`;
        break;
      case 'not_profile':
        messageTitle = 'ℹ️ Feedback sobre sua candidatura';
        messageText = `A empresa ${companyName} avaliou sua candidatura para a vaga "${jobTitle}".`;
        break;
      case 'interview':
        messageTitle = '🎉 Chamada para entrevista!';
        messageText = `Parabéns! A empresa ${companyName} quer te chamar para uma entrevista da vaga "${jobTitle}".`;
        break;
    }

    if (message) {
      messageText += ` Mensagem: "${message}"`;
    }

    const messageQuery = `
      INSERT INTO candidate_messages (candidate_id, company_id, job_id, message_type, title, message, content)
      VALUES ($1, $2, $3, 'interaction', $4, $5, $5) RETURNING *
    `;
    await pool.query(messageQuery, [candidateId, companyId, jobId, messageTitle, messageText]);

    res.status(201).json({ 
      success: true, 
      interaction: interactionResult.rows[0],
      message: 'Interação registrada e mensagem enviada ao candidato'
    });
  } catch (error) {
    console.error('Erro ao criar interação:', error);
    res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

export default router;

// Rotas auxiliares para candidate_messages
import { authenticateToken as auth } from '../middleware/auth.js';

router.get('/candidate/unread-count', auth, async (req, res) => {
  try {
    await ensureInteractionTables();
    if (req.user.type === 'company' || req.user.type === 'school') {
      return res.json({ count: 0 });
    }
    const r = await pool.query('SELECT COUNT(*)::int AS c FROM candidate_messages WHERE candidate_id = $1 AND is_read = FALSE', [req.user.id]);
    res.json({ count: r.rows[0].c });
  } catch (e) {
    console.error('Erro unread-count:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/candidate/latest', auth, async (req, res) => {
  try {
    await ensureInteractionTables();
    if (req.user.type === 'company' || req.user.type === 'school') {
      return res.json({ messages: [] });
    }
    const r = await pool.query('SELECT * FROM candidate_messages WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json({ messages: r.rows });
  } catch (e) {
    console.error('Erro latest messages:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/candidate/mark-read', auth, async (req, res) => {
  try {
    await ensureInteractionTables();
    if (req.user.type === 'company' || req.user.type === 'school') {
      return res.json({ success: true });
    }
    await pool.query('UPDATE candidate_messages SET is_read = TRUE, read_at = NOW() WHERE candidate_id = $1 AND is_read = FALSE', [req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Erro mark-read:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});
