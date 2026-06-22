// Migração para criar tabela de alertas de vagas
import pool from './config/database.js';

async function migrate() {
  console.log('🔧 Migração: Criar tabela job_alerts...\n');
  
  try {
    // Criar tabela de alertas de vagas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL DEFAULT 'Minha busca',
        filters JSONB NOT NULL DEFAULT '{}',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela job_alerts criada!');
    
    // Criar índice para busca por user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON job_alerts(user_id)
    `);
    console.log('✅ Índice idx_job_alerts_user_id criado!');
    
    console.log('\n📋 Resumo:');
    console.log('   - Tabela job_alerts criada');
    console.log('   - Alertas agora são salvos no banco de dados');
    console.log('   - Alertas persistem entre sessões e dispositivos');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
