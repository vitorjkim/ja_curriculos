import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration: Add Payments & Subscriptions tables...\n');

    // ─────────────────────────────────────────────────────────────────
    // 1. PAYMENTS TABLE
    // ─────────────────────────────────────────────────────────────────
    console.log('📝 Creating payments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gateway VARCHAR(50) NOT NULL DEFAULT 'stripe',  -- 'stripe', 'asaas'
        gateway_payment_id VARCHAR(255) UNIQUE NOT NULL,  -- Stripe payment_intent_id or Asaas id
        gateway_session_id VARCHAR(255),                  -- Stripe session_id for checkout
        plan VARCHAR(50) NOT NULL,                        -- 'free', 'pro', 'premium'
        amount DECIMAL(10, 2) NOT NULL,                   -- Amount in currency (BRL)
        currency VARCHAR(10) DEFAULT 'BRL',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',    -- 'pending', 'processing', 'succeeded', 'failed', 'canceled'
        payment_method VARCHAR(100),                      -- 'credit_card', 'pix', 'boleto'
        description TEXT,                                  -- Purpose (renewal, upgrade, etc)
        metadata JSONB DEFAULT '{}',                      -- Extra data (invoice_number, etc)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        failed_at TIMESTAMP,
        error_message TEXT
      );
    `);
    console.log('✅ Payments table created\n');

    // ─────────────────────────────────────────────────────────────────
    // 2. SUBSCRIPTIONS TABLE
    // ─────────────────────────────────────────────────────────────────
    console.log('📝 Creating subscriptions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gateway VARCHAR(50) NOT NULL DEFAULT 'stripe',
        gateway_subscription_id VARCHAR(255) UNIQUE NOT NULL,  -- Stripe subscription_id or Asaas subscription_id
        plan VARCHAR(50) NOT NULL,                             -- 'free', 'pro', 'premium'
        status VARCHAR(50) NOT NULL DEFAULT 'active',          -- 'active', 'past_due', 'unpaid', 'canceled'
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        cancel_at TIMESTAMP,
        canceled_at TIMESTAMP,
        auto_renew BOOLEAN DEFAULT TRUE,
        payment_method_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      );
    `);
    console.log('✅ Subscriptions table created\n');

    // ─────────────────────────────────────────────────────────────────
    // 3. INDICES FOR PERFORMANCE
    // ─────────────────────────────────────────────────────────────────
    console.log('📝 Creating indices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_subscription_id ON subscriptions(gateway_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
    `);
    console.log('✅ Indices created\n');

    // ─────────────────────────────────────────────────────────────────
    // 4. UPDATE users TABLE (add is_verified if not exists)
    // ─────────────────────────────────────────────────────────────────
    console.log('📝 Updating users table (adding is_verified if needed)...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Users table updated\n');

    // ─────────────────────────────────────────────────────────────────
    // 5. CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMP
    // ─────────────────────────────────────────────────────────────────
    console.log('📝 Creating trigger for auto-update timestamp...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_payment_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_payment_timestamp ON payments;
      CREATE TRIGGER trigger_update_payment_timestamp
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_payment_timestamp();
    `);
    console.log('✅ Payment timestamp trigger created\n');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_subscription_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_subscription_timestamp ON subscriptions;
      CREATE TRIGGER trigger_update_subscription_timestamp
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_subscription_timestamp();
    `);
    console.log('✅ Subscription timestamp trigger created\n');

    // ─────────────────────────────────────────────────────────────────
    // 6. CREATE AUDIT FUNCTION FOR PAYMENT EVENTS
    // ─────────────────────────────────────────────────────────────────
    console.log('📝 Creating payment logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,  -- 'created', 'processing', 'succeeded', 'failed', 'refunded'
        event_data JSONB DEFAULT '{}',
        gateway_event_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
    `);
    console.log('✅ Payment events table created\n');

    // ─────────────────────────────────────────────────────────────────
    // SUCCESS
    // ─────────────────────────────────────────────────────────────────
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION 003: PAYMENTS & SUBSCRIPTIONS COMPLETE   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Tables created:');
    console.log('  • payments (gateway payments tracking)');
    console.log('  • subscriptions (user subscriptions)');
    console.log('  • payment_events (audit trail)\n');

    console.log('📝 Columns added to users:');
    console.log('  • is_verified (for company verification)\n');

    console.log('🔍 Indices created for:');
    console.log('  • user_id lookups');
    console.log('  • gateway payment IDs');
    console.log('  • status filtering');
    console.log('  • timestamp ordering\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
