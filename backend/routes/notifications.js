/**
 * routes/notifications.js
 * Endpoints para gerenciar notificações e conformidade LGPD
 * 
 * Endpoints:
 * GET    /api/notifications              - Listar notificações do usuário
 * POST   /api/notifications/test         - Enviar e-mail de teste
 * GET    /api/users/profile/export       - Exportar dados (LGPD)
 * PATCH  /api/users/consent              - Atualizar consentimentos
 * GET    /api/users/consent              - Obter status de consentimentos
 */

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  notifyApplicationStatusChange,
  sendEmail,
  notifyConsentUpdate,
} from '../services/notificationService.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// 1. TESTES E UTILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/notifications/test
 * Envia e-mail de teste (apenas para usuário logado)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;

    const result = await sendEmail(
      email,
      '🧪 E-mail de Teste - CurrículoJá',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">E-mail de Teste 🧪</h2>
        <p>Se você recebeu este e-mail, o serviço de notificações está funcionando corretamente!</p>
        <p>Timestamp: ${new Date().toLocaleString('pt-BR')}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
      `
    );

    res.json({
      success: result.success,
      message: result.success ? 'E-mail de teste enviado!' : 'Erro ao enviar e-mail',
      result,
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de teste:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. GERENCIAR CONSENTIMENTOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/users/consent
 * Obter status atual de consentimentos do usuário
 */
router.get('/consent', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;

    const result = await pool.query(
      `SELECT id, email, name, consent_privacy_policy, consent_whatsapp, last_consent_update
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      consents: {
        privacyPolicy: user.consent_privacy_policy,
        whatsapp: user.consent_whatsapp,
        lastUpdate: user.last_consent_update,
      },
    });
  } catch (error) {
    console.error('Erro ao obter consentimentos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/users/consent
 * Atualizar consentimentos do usuário
 * Body: { consent_privacy_policy: boolean, consent_whatsapp: boolean }
 */
router.patch('/consent', authenticateToken, async (req, res) => {
  try {
    const { id, email, name } = req.user;
    const { consent_privacy_policy, consent_whatsapp } = req.body;

    // Validar que pelo menos um consentimento foi fornecido
    if (consent_privacy_policy === undefined && consent_whatsapp === undefined) {
      return res
        .status(400)
        .json({ success: false, error: 'Forneça consent_privacy_policy ou consent_whatsapp' });
    }

    // Obter valores anteriores para auditoria
    const previousResult = await pool.query(
      `SELECT consent_privacy_policy, consent_whatsapp FROM users WHERE id = $1`,
      [id]
    );
    const previous = previousResult.rows[0];

    // Construir query dinâmica
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (consent_privacy_policy !== undefined) {
      updates.push(`consent_privacy_policy = $${paramIndex++}`);
      values.push(consent_privacy_policy);
    }

    if (consent_whatsapp !== undefined) {
      updates.push(`consent_whatsapp = $${paramIndex++}`);
      values.push(consent_whatsapp);
    }

    updates.push(`last_consent_update = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, consent_privacy_policy, consent_whatsapp, last_consent_update
    `;

    const result = await pool.query(query, values);

    // Registrar auditoria (a trigger vai fazer isso automaticamente)
    // mas vamos registrar também em log

    // Enviar e-mail de confirmação
    if (result.rows.length > 0) {
      await notifyConsentUpdate(email, name);
    }

    res.json({
      success: true,
      message: 'Consentimentos atualizados com sucesso',
      consents: {
        privacyPolicy: result.rows[0].consent_privacy_policy,
        whatsapp: result.rows[0].consent_whatsapp,
        lastUpdate: result.rows[0].last_consent_update,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar consentimentos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. EXPORTAÇÃO DE DADOS (LGPD - Direito de Portabilidade)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/users/profile/export
 * Exporta todos os dados do usuário em JSON (conformidade LGPD)
 * Inclui: perfil, currículos, candidaturas, histórico de análises, etc.
 */
router.get('/profile/export', authenticateToken, async (req, res) => {
  try {
    const { id, email, type } = req.user;

    console.log(`📦 Exportando dados do usuário ${id}...`);

    // ─────────────────────────────────────────────────────────────────────
    // 1. DADOS DO PERFIL
    // ─────────────────────────────────────────────────────────────────────

    const userResult = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    const profileData = userResult.rows[0];

    // Remover dados sensíveis
    delete profileData.password;

    // ─────────────────────────────────────────────────────────────────────
    // 2. CURRÍCULOS (se candidato)
    // ─────────────────────────────────────────────────────────────────────

    let resumesData = [];
    if (type === 'candidate') {
      const resumesResult = await pool.query(
        `SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      resumesData = resumesResult.rows;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. CANDIDATURAS
    // ─────────────────────────────────────────────────────────────────────

    let applicationsData = [];
    if (type === 'candidate') {
      const applicationsResult = await pool.query(
        `SELECT a.*, j.title as job_title, j.company_id, c.name as company_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN users c ON j.company_id = c.id
         WHERE a.candidate_id = $1
         ORDER BY a.created_at DESC`,
        [id]
      );
      applicationsData = applicationsResult.rows;
    } else if (type === 'company') {
      // Se empresa, retorna candidaturas recebidas
      const applicationsResult = await pool.query(
        `SELECT a.*, j.title as job_title, u.email as candidate_email, u.name as candidate_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN users u ON a.candidate_id = u.id
         WHERE j.company_id = $1
         ORDER BY a.created_at DESC`,
        [id]
      );
      applicationsData = applicationsResult.rows;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. ANÁLISES DE IA (se existirem)
    // ─────────────────────────────────────────────────────────────────────

    let analysisData = [];
    if (type === 'candidate') {
      const analysisResult = await pool.query(
        `SELECT r.id, r.quality_score, r.score_explanation, r.ai_strengths, 
                r.ai_improvements, r.suggested_courses, r.analyzed_at
         FROM resumes r
         WHERE r.user_id = $1 AND r.analyzed_at IS NOT NULL
         ORDER BY r.analyzed_at DESC`,
        [id]
      );
      analysisData = analysisResult.rows;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. JOB ALERTS (se candidato)
    // ─────────────────────────────────────────────────────────────────────

    let jobAlertsData = [];
    if (type === 'candidate') {
      const alertsResult = await pool.query(
        `SELECT * FROM job_alerts WHERE user_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      jobAlertsData = alertsResult.rows;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. VAGAS PUBLICADAS (se empresa)
    // ─────────────────────────────────────────────────────────────────────

    let jobsData = [];
    if (type === 'company') {
      const jobsResult = await pool.query(`SELECT * FROM jobs WHERE company_id = $1`, [id]);
      jobsData = jobsResult.rows;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. HISTÓRICO DE CONSENTIMENTOS
    // ─────────────────────────────────────────────────────────────────────

    const consentResult = await pool.query(
      `SELECT * FROM consent_history WHERE user_id = $1 ORDER BY changed_at DESC LIMIT 50`,
      [id]
    );
    const consentHistory = consentResult.rows;

    // ─────────────────────────────────────────────────────────────────────
    // 8. MONTAR ARQUIVO COMPLETO
    // ─────────────────────────────────────────────────────────────────────

    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      dataPortabilityCompliance: 'LGPD Article 20',

      profile: profileData,

      resumes: {
        totalCount: resumesData.length,
        data: resumesData,
      },

      applications: {
        totalCount: applicationsData.length,
        data: applicationsData,
      },

      aiAnalyses: {
        totalCount: analysisData.length,
        data: analysisData,
      },

      jobAlerts: {
        totalCount: jobAlertsData.length,
        data: jobAlertsData,
      },

      publishedJobs: {
        totalCount: jobsData.length,
        data: jobsData,
      },

      consentHistory: {
        totalCount: consentHistory.length,
        data: consentHistory,
      },

      legalNotice: {
        language: 'pt-BR',
        processedData:
          'Este arquivo contém todos os seus dados pessoais processados pela plataforma CurrículoJá, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).',
        rightToAccess:
          'Você tem o direito de acessar todos os seus dados pessoais a qualquer momento.',
        rightToDelete:
          'Você tem o direito de solicitar a exclusão de seus dados, sujeito às exceções legais.',
        rightToRectification: 'Você tem o direito de corrigir dados imprecisos ou incompletos.',
      },
    };

    // ─────────────────────────────────────────────────────────────────────
    // 9. REGISTRAR EXPORTAÇÃO (auditoria)
    // ─────────────────────────────────────────────────────────────────────

    const exportSize = Buffer.byteLength(JSON.stringify(exportData), 'utf8');

    await pool.query(
      `INSERT INTO data_export_logs (user_id, export_date, file_size_bytes, status)
       VALUES ($1, $2, $3, 'success')`,
      [id, new Date(), exportSize]
    );

    // ─────────────────────────────────────────────────────────────────────
    // 10. RETORNAR COMO DOWNLOAD
    // ─────────────────────────────────────────────────────────────────────

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `curriculoja_dados_${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    console.log(`✅ Dados exportados com sucesso (${exportSize} bytes)`);

    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('Erro ao exportar dados:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LISTAR NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/notifications
 * Lista histórico de notificações do usuário
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;

    // Buscar histórico de exportações (exemplo de notificações)
    const result = await pool.query(
      `SELECT * FROM data_export_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({
      success: true,
      notifications: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Erro ao listar notificações:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
