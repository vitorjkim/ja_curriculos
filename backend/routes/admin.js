/**
 * Admin Routes
 * Endpoints para moderação e administração
 */

import express from 'express';
import pkg from 'pg';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Verificar se é admin
// ═══════════════════════════════════════════════════════════════════════

async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Apenas administradores podem acessar este recurso',
      });
    }

    next();
  } catch (error) {
    console.error('❌ Error checking admin role:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar permissões',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1. GET /api/admin/companies/pending
// ═══════════════════════════════════════════════════════════════════════
/**
 * Lista empresas pendentes de verificação
 * Autenticado + Admin
 */
router.get('/companies/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status = 'pending' } = req.query;

    const result = await pool.query(
      `SELECT 
        id, name, email, cnpj, company_name, company_website,
        subscription_plan, is_verified, created_at, updated_at
      FROM users
      WHERE type = $1 AND is_verified = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4`,
      ['company', false, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users
       WHERE type = $1 AND is_verified = $2`,
      ['company', false]
    );

    return res.json({
      success: true,
      companies: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    console.error('❌ Error fetching pending companies:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar empresas pendentes',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. GET /api/admin/companies/:id
// ═══════════════════════════════════════════════════════════════════════
/**
 * Detalhes de uma empresa para moderação
 * Autenticado + Admin
 */
router.get('/companies/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar detalhes da empresa
    const companyResult = await pool.query(
      `SELECT 
        id, name, email, phone, cnpj, company_name, company_website,
        company_size, company_sector, company_description,
        subscription_plan, subscription_status, is_verified,
        created_at, updated_at
      FROM users
      WHERE id = $1 AND type = $2`,
      [id, 'company']
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa não encontrada',
      });
    }

    const company = companyResult.rows[0];

    // Buscar vagas publicadas
    const jobsResult = await pool.query(
      `SELECT id, title, status, created_at
       FROM jobs
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    );

    // Buscar aplicações recebidas
    const applicationsResult = await pool.query(
      `SELECT COUNT(*) FROM applications
       WHERE job_id IN (SELECT id FROM jobs WHERE company_id = $1)`,
      [id]
    );

    // Buscar histórico de pagamentos
    const paymentsResult = await pool.query(
      `SELECT id, plan, status, amount, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    );

    return res.json({
      success: true,
      company,
      stats: {
        totalJobs: jobsResult.rows.length,
        totalApplications: parseInt(applicationsResult.rows[0].count, 10),
        recentJobs: jobsResult.rows,
        recentPayments: paymentsResult.rows,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching company details:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar detalhes da empresa',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 3. PATCH /api/admin/companies/:id/verify
// ═══════════════════════════════════════════════════════════════════════
/**
 * Aprova ou rejeita uma empresa
 * Autenticado + Admin
 * Body: { verified: boolean, reason?: string }
 */
router.patch(
  '/companies/:id/verify',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { verified, reason } = req.body;

      if (typeof verified !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Campo "verified" deve ser um booleano',
        });
      }

      // Buscar empresa
      const companyResult = await pool.query(
        'SELECT id, email, name FROM users WHERE id = $1 AND type = $2',
        [id, 'company']
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Empresa não encontrada',
        });
      }

      const company = companyResult.rows[0];

      // Atualizar verificação
      await pool.query(
        `UPDATE users
         SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [verified, id]
      );

      // Registrar auditoria
      await pool.query(
        `INSERT INTO admin_audit_log (admin_id, action, resource_id, resource_type, details, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          req.user.id,
          verified ? 'approve_company' : 'reject_company',
          id,
          'company',
          JSON.stringify({ reason: reason || 'Sem motivo especificado' }),
        ]
      );

      // Enviar email de notificação
      const status = verified ? 'aprovada' : 'rejeitada';
      const emailSubject = `Sua empresa foi ${status} no CurrículoJá`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${verified ? '#28a745' : '#dc3545'};">
            ${verified ? '✅ Empresa Aprovada!' : '❌ Empresa Rejeitada'}
          </h1>
          
          <p>Olá ${company.name},</p>
          
          ${
            verified
              ? `
            <p>Sua empresa foi aprovada e agora você pode publicar vagas publicamente!</p>
            <p>
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background: #28a745; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Ir para Dashboard
              </a>
            </p>
            `
              : `
            <p>Sua empresa foi rejeitada. ${reason ? `Motivo: ${reason}` : ''}</p>
            <p>Entre em contato conosco para mais informações.</p>
            `
          }
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Se tiver dúvidas, entre em contato: suporte@curriculoja.com
          </p>
        </div>
      `;

      // Enviar email (usar notificationService se disponível)
      try {
        const { sendEmail } = await import('../services/notificationService.js');
        await sendEmail(company.email, emailSubject, emailHtml);
      } catch (emailError) {
        console.warn('⚠️ Email notification failed:', emailError.message);
      }

      return res.json({
        success: true,
        message: `Empresa ${status} com sucesso`,
        companyId: id,
        verified,
      });
    } catch (error) {
      console.error('❌ Error verifying company:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar verificação da empresa',
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// 4. GET /api/admin/companies
// ═══════════════════════════════════════════════════════════════════════
/**
 * Lista todas as empresas (verificadas ou não)
 * Autenticado + Admin
 */
router.get('/companies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0, verified, plan } = req.query;

    let query = `
      SELECT 
        id, name, email, cnpj, company_name, company_website,
        subscription_plan, subscription_status, is_verified, created_at
      FROM users
      WHERE type = $1
    `;

    const params = ['company'];

    if (verified !== undefined) {
      query += ` AND is_verified = $${params.length + 1}`;
      params.push(verified === 'true');
    }

    if (plan) {
      query += ` AND subscription_plan = $${params.length + 1}`;
      params.push(plan);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      companies: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('❌ Error fetching companies:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar empresas',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. GET /api/admin/stats
// ═══════════════════════════════════════════════════════════════════════
/**
 * Estatísticas do admin
 * Autenticado + Admin
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total de usuários
    const usersResult = await pool.query('SELECT COUNT(*) FROM users WHERE type = $1', [
      'candidate',
    ]);
    const candidatesCount = parseInt(usersResult.rows[0].count, 10);

    // Total de empresas
    const companiesResult = await pool.query('SELECT COUNT(*) FROM users WHERE type = $1', [
      'company',
    ]);
    const companiesCount = parseInt(companiesResult.rows[0].count, 10);

    // Empresas verificadas
    const verifiedResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE type = $1 AND is_verified = $2',
      ['company', true]
    );
    const verifiedCount = parseInt(verifiedResult.rows[0].count, 10);

    // Total de vagas
    const jobsResult = await pool.query('SELECT COUNT(*) FROM jobs');
    const jobsCount = parseInt(jobsResult.rows[0].count, 10);

    // Receita total
    const revenueResult = await pool.query(
      'SELECT SUM(amount) FROM payments WHERE status = $1',
      ['succeeded']
    );
    const revenue = parseFloat(revenueResult.rows[0].sum || 0);

    return res.json({
      success: true,
      stats: {
        candidatesTotal: candidatesCount,
        companiesTotal: companiesCount,
        companiesVerified: verifiedCount,
        companiesPending: companiesCount - verifiedCount,
        jobsTotal: jobsCount,
        revenueTotal: revenue,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas',
    });
  }
});

export default router;
