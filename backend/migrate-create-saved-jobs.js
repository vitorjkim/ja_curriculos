// Migração para criar tabela de vagas salvas
import pool from './config/database.js';

async function migrate() {
  console.log('🔧 Migração: Criar tabela saved_jobs...\n');
  
  try {
    // Criar tabela de vagas salvas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, job_id)
      )
    `);
    console.log('✅ Tabela saved_jobs criada!');
    
    // Criar índice para busca por user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id)
    `);
    console.log('✅ Índice idx_saved_jobs_user_id criado!');
    
    console.log('\n📋 Resumo:');
    console.log('   - Tabela saved_jobs criada');
    console.log('   - Vagas salvas agora persistem no banco de dados');
    console.log('   - Vagas salvas persistem entre sessões e dispositivos');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
