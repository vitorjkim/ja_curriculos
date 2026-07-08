/**
 * Middleware: checkSubscriptionPlan
 * Valida se o usuário tem acesso ao recurso baseado no plano
 */

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Plano hierarchy (cada plano tem acesso aos recursos do seu nível e abaixo)
const PLAN_HIERARCHY = {
  free: 0,
  pro: 1,
  premium: 2,
};

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

/**
 * Valida se o usuário tem plano ativo e suficiente
 * @param {string|string[]} requiredPlan - Plano mínimo necessário ('free', 'pro', 'premium')
 * @returns {Function} Express middleware
 */
export function checkSubscriptionPlan(requiredPlan) {
  const requiredPlans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];

  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Autenticação necessária',
        });
      }

      // Buscar info de subscription do usuário
      let subscription_plan = 'free';
      let subscription_status = 'active';
      let is_verified = true;

      try {
        const userResult = await pool.query(
          `SELECT 
            subscription_plan,
            subscription_status,
            is_verified
          FROM users
          WHERE id = $1`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Usuário não encontrado',
          });
        }

        const user = userResult.rows[0];
        subscription_plan = user.subscription_plan || 'free';
        subscription_status = user.subscription_status || 'active';
        is_verified = user.is_verified !== false;
      } catch (dbError) {
        // Se a coluna não existir ou houver erro de schema, assume defaults seguros
        console.warn('⚠️ checkSubscriptionPlan: erro ao buscar plano, usando defaults:', dbError.message);
      }

      // ─────────────────────────────────────────────────────────
      // 1. Validar se subscription está ativa
      // ─────────────────────────────────────────────────────────
      if (subscription_status !== 'active') {
        return res.status(402).json({
          success: false,
          error: 'Sua assinatura está expirada ou pendente de pagamento',
          status: subscription_status,
          action: 'upgrade_required',
          upgradeUrl: '/pricing',
        });
      }

      // ─────────────────────────────────────────────────────────
      // 2. Validar plano suficiente
      // ─────────────────────────────────────────────────────────
      const userPlanLevel = PLAN_HIERARCHY[subscription_plan] || PLAN_HIERARCHY.free;
      const minRequiredLevel = Math.min(
        ...requiredPlans.map((p) => PLAN_HIERARCHY[p] || 0)
      );

      if (userPlanLevel < minRequiredLevel) {
        return res.status(403).json({
          success: false,
          error: `Plano ${requiredPlans.join(' ou ')} necessário para acessar este recurso`,
          currentPlan: subscription_plan,
          requiredPlans,
          action: 'upgrade_required',
          upgradeUrl: '/pricing',
        });
      }

      // ─────────────────────────────────────────────────────────
      // 3. Se for empresa, validar verificação
      // ─────────────────────────────────────────────────────────
      if (req.user?.type === 'company' && !is_verified && subscription_plan !== 'free') {
        return res.status(403).json({
          success: false,
          error: 'Sua conta ainda está em revisão. Entre em contato com o suporte.',
          status: 'pending_verification',
          action: 'contact_support',
        });
      }

      // Anexar info ao request para uso posterior
      req.subscription = {
        plan: subscription_plan,
        status: subscription_status,
        isVerified: is_verified,
      };

      next();
    } catch (error) {
      console.error('❌ Error in checkSubscriptionPlan middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar plano',
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARES ESPECÍFICOS (para uso simplificado)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Qualquer plano (inclusive free) - apenas valida que está ativo
 */
export const requireActiveSubscription = checkSubscriptionPlan('free');

/**
 * Pro ou superior
 */
export const requireProPlan = checkSubscriptionPlan(['pro', 'premium']);

/**
 * Premium apenas
 */
export const requirePremiumPlan = checkSubscriptionPlan('premium');

// ═══════════════════════════════════════════════════════════════════════
// VALIDADORES DE RECURSO ESPECÍFICO
// ═══════════════════════════════════════════════════════════════════════

/**
 * Valida limite de vagas por mês (2 para free, ilimitado para pro/premium)
 */
export async function validateJobPostingLimit(userId, userType) {
  try {
    // Apenas para empresas
    if (userType !== 'company') return true;

    const userResult = await pool.query(
      'SELECT subscription_plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return false;

    const plan = userResult.rows[0].subscription_plan;

    // Plano free tem limite de 2 vagas por mês
    if (plan !== 'free') {
      return true; // Pro e premium sem limite
    }

    // Contar vagas criadas neste mês
    const jobsResult = await pool.query(
      `SELECT COUNT(*) FROM jobs
       WHERE company_id = $1
       AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`,
      [userId]
    );

    const jobsThisMonth = parseInt(jobsResult.rows[0].count, 10);
    const limit = 2;

    if (jobsThisMonth >= limit) {
      return {
        allowed: false,
        reason: `Limite de ${limit} vagas por mês atingido`,
        current: jobsThisMonth,
        limit,
        upgradePlan: 'pro',
      };
    }

    return true;
  } catch (error) {
    console.error('❌ Error validating job posting limit:', error);
    return true; // Fail open
  }
}

/**
 * Valida se usuário pode acessar ranking de candidatos
 */
export function canViewCandidateRanking(plan) {
  return plan === 'pro' || plan === 'premium';
}

/**
 * Valida se usuário pode usar IA
 */
export function canUseAI(plan) {
  return plan === 'premium';
}

/**
 * Valida se usuário pode usar busca avançada
 */
export function canUseAdvancedSearch(plan) {
  return plan === 'premium';
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDADOR DE VERIFICAÇÃO DE EMPRESA
// ═══════════════════════════════════════════════════════════════════════

/**
 * Middleware: Valida se empresa está verificada para publicar vagas
 */
export async function validateCompanyVerification(req, res, next) {
  try {
    const userId = req.user?.id;
    const userType = req.user?.type;

    if (userType !== 'company') {
      return next(); // Não é empresa, pula validação
    }

    const userResult = await pool.query(
      'SELECT is_verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa não encontrada',
      });
    }

    const isVerified = userResult.rows[0].is_verified;

    if (!isVerified) {
      // Adicionar flag ao request para indicar que precisa verificação
      req.needsVerification = true;
    }

    next();
  } catch (error) {
    console.error('❌ Error validating company verification:', error);
    next();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Obter info de quota de usuário
// ═══════════════════════════════════════════════════════════════════════

export async function getUserQuota(userId) {
  try {
    const result = await pool.query(
      `SELECT 
        u.subscription_plan,
        u.subscription_status,
        u.type,
        COUNT(j.id) as jobs_this_month
      FROM users u
      LEFT JOIN jobs j ON u.id = j.company_id
        AND EXTRACT(MONTH FROM j.created_at) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(YEAR FROM j.created_at) = EXTRACT(YEAR FROM NOW())
      WHERE u.id = $1
      GROUP BY u.id, u.subscription_plan, u.subscription_status, u.type`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { subscription_plan, type, jobs_this_month } = result.rows[0];

    return {
      plan: subscription_plan,
      type,
      jobsThisMonth: parseInt(jobs_this_month, 10),
      jobsLimit: subscription_plan === 'free' ? 2 : Infinity,
      canPostJob:
        subscription_plan !== 'free' || parseInt(jobs_this_month, 10) < 2,
      canViewRanking: canViewCandidateRanking(subscription_plan),
      canUseAI: canUseAI(subscription_plan),
      canUseAdvancedSearch: canUseAdvancedSearch(subscription_plan),
    };
  } catch (error) {
    console.error('❌ Error getting user quota:', error);
    return null;
  }
}
