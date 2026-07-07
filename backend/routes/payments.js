/**
 * Payment Routes
 * Endpoints para checkout, webhook e gerenciamento de assinaturas
 */

import express from 'express';
import Stripe from 'stripe';
import {
  createCheckoutSession,
  processStripeWebhook,
  getUserSubscription,
  getAvailablePlans,
  cancelSubscription,
} from '../services/paymentService.js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ═══════════════════════════════════════════════════════════════════════
// 1. GET /api/payments/plans
// ═══════════════════════════════════════════════════════════════════════
/**
 * Retorna lista de planos disponíveis
 * Public endpoint
 */
router.get('/plans', (req, res) => {
  try {
    const plans = getAvailablePlans();
    return res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('❌ Error fetching plans:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar planos',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. POST /api/payments/checkout
// ═══════════════════════════════════════════════════════════════════════
/**
 * Cria uma sessão de checkout do Stripe
 * Autenticado - POST com body: { plan: 'pro'|'premium' }
 */
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Plano não especificado',
      });
    }

    const result = await createCheckoutSession(userId, plan);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Se for plano free, não precisa de checkout
    if (plan === 'free') {
      return res.json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao criar sessão de checkout',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 3. POST /api/payments/webhook
// ═══════════════════════════════════════════════════════════════════════
/**
 * Webhook do Stripe
 * Processa eventos de pagamento em tempo real
 * Raw body necessário para validação de assinatura
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
      // Validar assinatura do webhook
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log(`📨 Webhook received: ${event.type}`);

      // Processar evento
      const success = await processStripeWebhook(event);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Falha ao processar webhook',
        });
      }

      return res.json({ success: true, received: true });
    } catch (error) {
      console.error('❌ Webhook Error:', error.message);
      return res.status(400).json({
        error: `Webhook Error: ${error.message}`,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// 4. GET /api/payments/subscription
// ═══════════════════════════════════════════════════════════════════════
/**
 * Retorna info de subscription atual do usuário
 * Autenticado
 */
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        plan: 'free',
        status: 'active',
        message: 'Usando plano gratuito',
      });
    }

    return res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar assinatura',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. POST /api/payments/cancel
// ═══════════════════════════════════════════════════════════════════════
/**
 * Cancela assinatura do usuário
 * Autenticado
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await cancelSubscription(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao cancelar assinatura',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 6. GET /api/payments/success
// ═══════════════════════════════════════════════════════════════════════
/**
 * Página de sucesso após checkout
 * Valida sessão do Stripe
 */
router.get('/success', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID não fornecido',
      });
    }

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Pagamento não foi concluído',
        status: session.payment_status,
      });
    }

    return res.json({
      success: true,
      message: 'Pagamento confirmado com sucesso!',
      plan: session.metadata?.plan,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar pagamento',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 7. GET /api/payments/billing-history
// ═══════════════════════════════════════════════════════════════════════
/**
 * Retorna histórico de pagamentos
 * Autenticado
 */
router.get('/billing-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const result = await req.app
      .locals.pool.query(
        `SELECT 
          id, plan, amount, status, created_at, description
        FROM payments
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

    return res.json({
      success: true,
      payments: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('❌ Error fetching billing history:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico de pagamentos',
    });
  }
});

export default router;
