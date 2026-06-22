/**
 * Migração: Corrigir a constraint ON DELETE CASCADE para ON DELETE SET NULL
 * 
 * PROBLEMA: Quando um currículo era deletado, todas as candidaturas que usavam
 * esse currículo também eram deletadas automaticamente (CASCADE).
 * 
 * SOLUÇÃO: Alterar para SET NULL - quando o currículo for deletado, o resume_id
 * na candidatura será definido como NULL, mas a candidatura será mantida.
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
    console.log('🔧 Iniciando migração: Corrigir constraint de resume_id em applications...\n');
    
    await client.query('BEGIN');
    
    // 1. Verificar se a constraint existe
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'applications' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%resume%'
    `);
    
    console.log('📋 Constraints encontradas:', constraintCheck.rows);
    
    // 2. Buscar o nome exato da constraint de resume_id
    const fkResult = await client.query(`
      SELECT tc.constraint_name, ccu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'applications' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'resumes'
    `);
    
    if (fkResult.rows.length === 0) {
      console.log('⚠️  Nenhuma constraint de foreign key para resumes encontrada.');
      console.log('   Isso pode significar que a constraint já foi removida ou não existe.');
      
      // Verificar se a coluna resume_id existe
      const columnCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'resume_id'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('❌ Coluna resume_id não existe na tabela applications!');
        await client.query('ROLLBACK');
        return;
      }
      
      console.log('✅ Coluna resume_id existe. Adicionando constraint com SET NULL...');
      
      // Adicionar a constraint com SET NULL
      await client.query(`
        ALTER TABLE applications 
        ADD CONSTRAINT applications_resume_id_fkey 
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
      `);
      
      console.log('✅ Constraint adicionada com sucesso!');
    } else {
      const constraintName = fkResult.rows[0].constraint_name;
      console.log(`📌 Constraint encontrada: ${constraintName}`);
      
      // 3. Remover a constraint antiga
      console.log('🗑️  Removendo constraint antiga com CASCADE...');
      await client.query(`ALTER TABLE applications DROP CONSTRAINT ${constraintName}`);
      
      // 4. Adicionar nova constraint com SET NULL
      console.log('➕ Adicionando nova constraint com SET NULL...');
      await client.query(`
        ALTER TABLE applications 
        ADD CONSTRAINT ${constraintName} 
        FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
      `);
      
      console.log('✅ Constraint atualizada com sucesso!');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('   Agora, quando um currículo for deletado, as candidaturas serão mantidas');
    console.log('   e o campo resume_id será definido como NULL.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
