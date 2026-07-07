/**
 * Migração 005: Adicionar campos de IA à tabela de currículos
 * 
 * Adiciona:
 * - ai_score: Score de qualidade do currículo (0-100)
 * - ai_analysis: JSONB com análise completa (sugestões, métricas, etc)
 * - ai_analyzed_at: Timestamp da última análise
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregador do .env
dotenv.config({ path: join(__dirname, '..', '.env') });

// Função para obter config do banco igual a database.js
function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  const host     = process.env.PGHOST     || process.env.DB_HOST     || 'localhost';
  const port     = process.env.PGPORT     || process.env.DB_PORT     || 5432;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.DB_NAME || 'curriculoja';
  const user     = process.env.PGUSER     || process.env.DB_USER     || 'postgres';
  const rawPw    = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  const password = typeof rawPw === 'string' && rawPw.length > 0 ? rawPw : undefined;

  return {
    host,
    port: Number(port),
    database,
    user,
    password,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(getPoolConfig());

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Iniciando migração 005: Adicionar campos de IA aos currículos...');
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Adicionar coluna ai_score (integer, padrão NULL)
    await client.query(`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT NULL;
    `);
    console.log('✅ Coluna ai_score adicionada');
    
    // Adicionar coluna ai_analysis (JSONB para guardar análise completa)
    await client.query(`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL;
    `);
    console.log('✅ Coluna ai_analysis adicionada');
    
    // Adicionar coluna ai_analyzed_at (timestamp da última análise)
    await client.query(`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✅ Coluna ai_analyzed_at adicionada');
    
    // Criar índice para melhorar queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_ai_score 
      ON resumes(ai_score DESC NULLS LAST);
    `);
    console.log('✅ Índice idx_resumes_ai_score criado');
    
    // Criar índice para buscar currículos analisados recentemente
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_ai_analyzed_at 
      ON resumes(ai_analyzed_at DESC NULLS LAST);
    `);
    console.log('✅ Índice idx_resumes_ai_analyzed_at criado');
    
    // Commit da transação
    await client.query('COMMIT');
    
    console.log('✨ Migração 005 completada com sucesso!');
    console.log('\n📊 Novos campos adicionados:');
    console.log('  - ai_score (INTEGER): Score 0-100');
    console.log('  - ai_analysis (JSONB): Análise estruturada da IA');
    console.log('  - ai_analyzed_at (TIMESTAMP): Data da análise');
    
  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK');
    console.error('❌ Erro durante migração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar migração
migrate().catch(error => {
  console.error('Migração falhou:', error);
  process.exit(1);
});
