/**
 * Payment Service - Gerencia todas as operações de pagamento
 * Suporta: Stripe e Asaas
 */

import Stripe from 'stripe';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ═══════════════════════════════════════════════════════════════════════
// PLANOS E PREÇOS
// ═══════════════════════════════════════════════════════════════════════

const PLANS = {
  free: {
    name: 'Gratuito',
    price: 0,
    currency: 'BRL',
    description: 'Perfeito para começar',
    features: [
      '2 vagas por mês',
      'Perfil básico',
      'Sem acesso à IA',
      'Sem ranking de candidatos',
    ],
  },
  pro: {
    name: 'Pro',
    price: 9900, // R$ 99.00 in cents
    currency: 'BRL',
    description: 'Para empresas em crescimento',
    features: [
      'Vagas ilimitadas',
      'Visualizar ranking de candidatos',
      'Suporte prioritário',
      'Sem acesso à IA avançada',
    ],
    stripeProductId: process.env.STRIPE_PRO_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  premium: {
    name: 'Premium',
    price: 29900, // R$ 299.00 in cents
    currency: 'BRL',
    description: 'Solução completa',
    features: [
      'Tudo do plano Pro',
      'IA para análise de currículos',
      'Busca avançada no banco de talentos',
      'Relatórios detalhados',
      'Suporte dedicado',
    ],
    stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// 1. CRIAR SESSÃO DE CHECKOUT (Stripe)
// ═══════════════════════════════════════════════════════════════════════

export async function createCheckoutSession(userId, plan, metadata = {}) {
  try {
    if (!PLANS[plan]) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    // Plano gratuito não precisa de checkout
    if (plan === 'free') {
      return {
        success: true,
        plan: 'free',
        message: 'Plano gratuito ativado automaticamente',
        checkoutUrl: null,
      };
    }

    // Buscar usuário
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const user = userResult.rows[0];
    const planData = PLANS[plan];

    // Criar sessão de checkout Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: userId,
      line_items: [
        {
          price: planData.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId,
        plan,
        ...metadata,
      },
    });

    // Salvar tentativa de pagamento
    await pool.query(
      `INSERT INTO payments (
        user_id, gateway, gateway_session_id, plan, 
        status, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'stripe',
        session.id,
        plan,
        'pending',
        `Checkout session for ${plan} plan`,
        JSON.stringify({
          sessionId: session.id,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      plan,
    };
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 2. PROCESSAR WEBHOOK (Stripe)
// ═══════════════════════════════════════════════════════════════════════

export async function processStripeWebhook(event) {
  try {
    switch (event.type) {
      // ─────────────────────────────────────────────────────────
      // Checkout Session Completed
      // ─────────────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.error('❌ Missing userId or plan in webhook');
          return false;
        }

        // Atualizar subscription do usuário
        await updateUserSubscription(userId, plan, 'active', session.subscription);

        // Enviar email de confirmação
        await sendPaymentConfirmationEmail(userId, plan);

        console.log(
          `✅ Checkout completed for user ${userId}, plan: ${plan}`
        );
        return true;
      }

      // ─────────────────────────────────────────────────────────
      // Invoice Paid (Renovação)
      // ─────────────────────────────────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object;

        // Buscar subscription no BD
        const subResult = await pool.query(
          'SELECT user_id, plan FROM subscriptions WHERE gateway_subscription_id = $1',
          [invoice.subscription]
        );

        if (subResult.rows.length === 0) {
          console.warn('Subscription not found for invoice:', invoice.subscription);
          return false;
        }

        const { user_id, plan } = subResult.rows[0];

        // Atualizar status para active
        await pool.query(
          `UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE gateway_subscription_id = $2`,
          ['active', invoice.subscription]
        );

        // Registrar pagamento
        await registerPayment(
          user_id,
          invoice.id,
          plan,
          invoice.amount_paid,
          'succeeded',
          'Recurring payment - Invoice paid'
        );

        console.log(`✅ Invoice paid for subscription ${invoice.subscription}`);
        return true;
      }

      // ─────────────────────────────────────────────────────────
      // Invoice Payment Failed
      // ─────────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        const subResult = await pool.query(
          'SELECT user_id, plan FROM subscriptions WHERE gateway_subscription_id = $1',
          [invoice.subscription]
        );

        if (subResult.rows.length === 0) {
          console.warn('Subscription not found for invoice:', invoice.subscription);
          return false;
        }

        const { user_id, plan } = subResult.rows[0];

        // Atualizar status para past_due
        await pool.query(
          `UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE gateway_subscription_id = $2`,
          ['past_due', invoice.subscription]
        );

        // Atualizar user subscription_status
        await pool.query(
          `UPDATE users SET subscription_status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          ['past_due', user_id]
        );

        console.log(
          `⚠️ Invoice payment failed for subscription ${invoice.subscription}`
        );
        return true;
      }

      // ─────────────────────────────────────────────────────────
      // Subscription Canceled
      // ─────────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        const subResult = await pool.query(
          'SELECT user_id FROM subscriptions WHERE gateway_subscription_id = $1',
          [subscription.id]
        );

        if (subResult.rows.length === 0) {
          console.warn('Subscription not found:', subscription.id);
          return false;
        }

        const userId = subResult.rows[0].user_id;

        // Atualizar status para canceled
        await pool.query(
          `UPDATE subscriptions SET status = $1, canceled_at = CURRENT_TIMESTAMP
           WHERE gateway_subscription_id = $2`,
          ['canceled', subscription.id]
        );

        // Downgrade para free
        await pool.query(
          `UPDATE users 
           SET subscription_plan = $1, subscription_status = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          ['free', 'active', userId]
        );

        console.log(`✅ Subscription canceled for user ${userId}`);
        return true;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return true;
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 3. ATUALIZAR SUBSCRIPTION DO USUÁRIO
// ═══════════════════════════════════════════════════════════════════════

export async function updateUserSubscription(
  userId,
  plan,
  status = 'active',
  stripeSubscriptionId = null
) {
  try {
    // Atualizar ou criar subscription
    if (stripeSubscriptionId) {
      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      await pool.query(
        `INSERT INTO subscriptions (
          user_id, gateway_subscription_id, plan, status, 
          current_period_start, current_period_end
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (gateway_subscription_id) DO UPDATE SET
          plan = $3,
          status = $4,
          current_period_start = $5,
          current_period_end = $6,
          updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          stripeSubscriptionId,
          plan,
          status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
        ]
      );
    }

    // Atualizar user table
    await pool.query(
      `UPDATE users 
       SET subscription_plan = $1, subscription_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [plan, status, userId]
    );

    return {
      success: true,
      plan,
      status,
    };
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 4. REGISTRAR PAGAMENTO
// ═══════════════════════════════════════════════════════════════════════

async function registerPayment(
  userId,
  gatewayPaymentId,
  plan,
  amount,
  status,
  description = null
) {
  try {
    const planData = PLANS[plan];

    await pool.query(
      `INSERT INTO payments (
        user_id, gateway, gateway_payment_id, plan, 
        amount, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (gateway_payment_id) DO UPDATE SET
        status = $6,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        'stripe',
        gatewayPaymentId,
        plan,
        amount / 100, // Convert from cents to decimal
        status,
        description,
      ]
    );
  } catch (error) {
    console.error('❌ Error registering payment:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 5. BUSCAR SUBSCRIPTION ATUAL
// ═══════════════════════════════════════════════════════════════════════

export async function getUserSubscription(userId) {
  try {
    const result = await pool.query(
      `SELECT 
        u.subscription_plan,
        u.subscription_status,
        s.id as subscription_id,
        s.gateway_subscription_id,
        s.current_period_end,
        s.auto_renew
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
      ORDER BY s.created_at DESC
      LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    return {
      plan: data.subscription_plan || 'free',
      status: data.subscription_status || 'active',
      subscriptionId: data.subscription_id,
      gatewaySubscriptionId: data.gateway_subscription_id,
      periodEnd: data.current_period_end,
      autoRenew: data.auto_renew ?? true,
      planDetails: PLANS[data.subscription_plan || 'free'],
    };
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 6. LISTAR PLANOS
// ═══════════════════════════════════════════════════════════════════════

export function getAvailablePlans() {
  return Object.entries(PLANS).map(([key, data]) => ({
    id: key,
    ...data,
    price_formatted: data.price === 0 ? 'Gratuito' : `R$ ${(data.price / 100).toFixed(2)}/mês`,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// 7. CANCELAR SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════

export async function cancelSubscription(userId) {
  try {
    // Buscar subscription do Stripe
    const subResult = await pool.query(
      'SELECT gateway_subscription_id FROM subscriptions WHERE user_id = $1 AND status != $2',
      [userId, 'canceled']
    );

    if (subResult.rows.length === 0) {
      return {
        success: false,
        error: 'Nenhuma assinatura ativa encontrada',
      };
    }

    const { gateway_subscription_id } = subResult.rows[0];

    // Cancelar no Stripe
    await stripe.subscriptions.del(gateway_subscription_id);

    // Downgrade para free
    await updateUserSubscription(userId, 'free', 'active');

    return {
      success: true,
      message: 'Assinatura cancelada com sucesso',
    };
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 8. HELPERS - ENVIAR EMAILS
// ═══════════════════════════════════════════════════════════════════════

async function sendPaymentConfirmationEmail(userId, plan) {
  try {
    // Importar serviço de notificação
    const { sendEmail } = await import('./notificationService.js');

    const userResult = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const { email, name } = userResult.rows[0];
    const planData = PLANS[plan];

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bem-vindo ao plano ${planData.name}! 🎉</h1>
        
        <p>Olá ${name},</p>
        
        <p>Seu pagamento foi processado com sucesso!</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333;">Seu novo plano:</h3>
          <p><strong>${planData.name}</strong></p>
          <p style="color: #666;">R$ ${(planData.price / 100).toFixed(2)}/mês</p>
          
          <h4 style="color: #333;">Benefícios inclusos:</h4>
          <ul style="color: #666;">
            ${planData.features.map((f) => `<li>${f}</li>`).join('')}
          </ul>
        </div>
        
        <p>Você já pode usar todos os recursos do seu novo plano!</p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Se tiver alguma dúvida, entre em contato conosco através do painel de suporte.
        </p>
      </div>
    `;

    await sendEmail(email, `Bem-vindo ao CurrículoJá ${planData.name}!`, html);
  } catch (error) {
    console.error('❌ Error sending payment confirmation email:', error);
  }
}

export { PLANS };
