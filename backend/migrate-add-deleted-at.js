/**
 * Migração: Adicionar coluna deleted_at na tabela resumes
 * 
 * OBJETIVO: Implementar soft delete para currículos
 * - Quando o aluno "deleta" um currículo, apenas marca como deletado
 * - O currículo continua visível para empresas e escolas
 * - Permite manter histórico de candidaturas com currículos
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Migração: Adicionar coluna deleted_at na tabela resumes...\n');
    
    // Verificar se a coluna já existe
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'deleted_at'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Coluna deleted_at já existe na tabela resumes.');
      console.log('   Nenhuma alteração necessária.\n');
    } else {
      console.log('➕ Adicionando coluna deleted_at...');
      
      await client.query(`
        ALTER TABLE resumes 
        ADD COLUMN deleted_at TIMESTAMP NULL
      `);
      
      console.log('✅ Coluna deleted_at adicionada com sucesso!\n');
    }
    
    console.log('📋 Resumo da mudança:');
    console.log('   - Currículos agora usam "soft delete"');
    console.log('   - Quando aluno "deleta", marca deleted_at = NOW()');
    console.log('   - Currículo some da lista do aluno');
    console.log('   - Currículo continua visível para empresas/escolas');
    console.log('   - Histórico de candidaturas preservado\n');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
