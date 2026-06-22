// Script para adicionar campos de redes sociais (LinkedIn e Instagram) na tabela users
import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;

// Garantir que o .env certo (da pasta backend) seja carregado
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: typeof process.env.DB_PASSWORD === 'string' && process.env.DB_PASSWORD.length > 0
    ? process.env.DB_PASSWORD
    : undefined,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Adicionando campos de redes sociais na tabela users...');
    
    // Adicionar coluna linkedin_url
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255)
    `);
    console.log('✅ Coluna linkedin_url adicionada');
    
    // Adicionar coluna instagram_url
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255)
    `);
    console.log('✅ Coluna instagram_url adicionada');
    
    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
