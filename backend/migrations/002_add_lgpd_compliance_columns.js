/**
 * Migration: 002_add_lgpd_compliance_columns.js
 * 
 * Adiciona colunas de conformidade LGPD à tabela users:
 * - consent_privacy_policy: Consentimento para comunicações e processamento de dados
 * - consent_whatsapp: Consentimento específico para mensagens WhatsApp
 * - last_consent_update: Data da última atualização de consentimento
 * 
 * Execução: node backend/migrations/002_add_lgpd_compliance_columns.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migração LGPD...\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ADICIONAR COLUNA consent_privacy_policy
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(
        `ALTER TABLE users ADD COLUMN consent_privacy_policy BOOLEAN DEFAULT FALSE`
      );
      console.log('✅ Coluna consent_privacy_policy adicionada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Coluna consent_privacy_policy já existe, pulando...');
      } else {
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. ADICIONAR COLUNA consent_whatsapp
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(`ALTER TABLE users ADD COLUMN consent_whatsapp BOOLEAN DEFAULT FALSE`);
      console.log('✅ Coluna consent_whatsapp adicionada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Coluna consent_whatsapp já existe, pulando...');
      } else {
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ADICIONAR COLUNA last_consent_update
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(
        `ALTER TABLE users ADD COLUMN last_consent_update TIMESTAMP DEFAULT NULL`
      );
      console.log('✅ Coluna last_consent_update adicionada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Coluna last_consent_update já existe, pulando...');
      } else {
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. CRIAR TABELA data_export_logs (para auditoria de exportações LGPD)
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_export_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          export_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          export_type VARCHAR(50) DEFAULT 'json',
          file_size_bytes INTEGER,
          status VARCHAR(20) CHECK (status IN ('success', 'pending', 'failed')) DEFAULT 'success',
          ip_address VARCHAR(50),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela data_export_logs criada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Tabela data_export_logs já existe, pulando...');
      } else {
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. CRIAR TABELA consent_history (auditoria de mudanças de consentimento)
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS consent_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          consent_privacy_policy_before BOOLEAN,
          consent_privacy_policy_after BOOLEAN,
          consent_whatsapp_before BOOLEAN,
          consent_whatsapp_after BOOLEAN,
          ip_address VARCHAR(50),
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela consent_history criada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Tabela consent_history já existe, pulando...');
      } else {
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. CRIAR ÍNDICES PARA PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_consent_privacy 
        ON users(consent_privacy_policy)
      `);
      console.log('✅ Índice idx_users_consent_privacy criado');
    } catch (error) {
      console.log('⚠️  Índice idx_users_consent_privacy já existe');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_consent_whatsapp 
        ON users(consent_whatsapp)
      `);
      console.log('✅ Índice idx_users_consent_whatsapp criado');
    } catch (error) {
      console.log('⚠️  Índice idx_users_consent_whatsapp já existe');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_data_export_logs_user 
        ON data_export_logs(user_id)
      `);
      console.log('✅ Índice idx_data_export_logs_user criado');
    } catch (error) {
      console.log('⚠️  Índice idx_data_export_logs_user já existe');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_consent_history_user 
        ON consent_history(user_id)
      `);
      console.log('✅ Índice idx_consent_history_user criado');
    } catch (error) {
      console.log('⚠️  Índice idx_consent_history_user já existe');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. CRIAR FUNCTION PARA AUDITORIA DE CONSENTIMENTO
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION log_consent_change()
        RETURNS TRIGGER AS $$
        BEGIN
          IF (OLD.consent_privacy_policy IS DISTINCT FROM NEW.consent_privacy_policy)
            OR (OLD.consent_whatsapp IS DISTINCT FROM NEW.consent_whatsapp) THEN
            INSERT INTO consent_history (
              user_id,
              consent_privacy_policy_before,
              consent_privacy_policy_after,
              consent_whatsapp_before,
              consent_whatsapp_after
            ) VALUES (
              NEW.id,
              OLD.consent_privacy_policy,
              NEW.consent_privacy_policy,
              OLD.consent_whatsapp,
              NEW.consent_whatsapp
            );
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('✅ Função log_consent_change criada');
    } catch (error) {
      console.log('⚠️  Função log_consent_change já existe');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. CRIAR TRIGGER PARA AUDITORIA
    // ═══════════════════════════════════════════════════════════════════════

    try {
      await client.query(`
        DROP TRIGGER IF EXISTS trigger_consent_change ON users;
      `);
      await client.query(`
        CREATE TRIGGER trigger_consent_change
        AFTER UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION log_consent_change();
      `);
      console.log('✅ Trigger trigger_consent_change criado');
    } catch (error) {
      console.log('⚠️  Trigger trigger_consent_change já existe');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. VERIFICAR ESTRUTURA FINAL
    // ═══════════════════════════════════════════════════════════════════════

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('consent_privacy_policy', 'consent_whatsapp', 'last_consent_update')
      ORDER BY column_name
    `);

    console.log('\n📊 Colunas LGPD na tabela users:');
    result.rows.forEach((row) => {
      console.log(`  • ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ Migração LGPD concluída com sucesso!\n');
    console.log('📋 Resumo:');
    console.log('  ✓ Coluna consent_privacy_policy adicionada');
    console.log('  ✓ Coluna consent_whatsapp adicionada');
    console.log('  ✓ Tabela data_export_logs criada');
    console.log('  ✓ Tabela consent_history criada');
    console.log('  ✓ 4 índices criados para performance');
    console.log('  ✓ Trigger de auditoria configurado');
    console.log('\n💡 Próximos passos:');
    console.log('  1. Integrar consentimentos no formulário de cadastro');
    console.log('  2. Adicionar checkboxes no painel de configurações');
    console.log('  3. Testar endpoint /api/users/profile/export');
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar migração
runMigration();
