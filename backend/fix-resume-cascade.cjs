/**
 * Verificar e corrigir a constraint ON DELETE CASCADE para ON DELETE SET NULL
 * Este script usa CommonJS para evitar problemas de ESM
 */

const { Pool } = require('pg');
require('dotenv').config();

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
    console.log('============================================================');
    console.log('MIGRACAO: Corrigir constraint de resume_id');
    console.log('============================================================');
    
    await client.query('BEGIN');
    
    // Buscar todas as FK constraints da tabela applications
    const fkResult = await client.query(`
      SELECT 
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'applications' 
        AND con.contype = 'f'
    `);
    
    console.log('Constraints FK encontradas:');
    fkResult.rows.forEach(row => {
      console.log('  - ' + row.constraint_name + ': ' + row.definition);
    });
    
    // Encontrar a constraint de resume_id
    const resumeFK = fkResult.rows.find(row => 
      row.definition.includes('resume_id') || row.constraint_name.includes('resume')
    );
    
    if (!resumeFK) {
      console.log('AVISO: Nenhuma FK para resume_id encontrada');
      
      // Verificar se coluna existe
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'resume_id'
      `);
      
      if (colCheck.rows.length > 0) {
        console.log('Coluna resume_id existe. Adicionando constraint...');
        await client.query(`
          ALTER TABLE applications 
          ADD CONSTRAINT applications_resume_id_fkey 
          FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
        `);
        console.log('SUCESSO: Constraint adicionada com SET NULL');
      } else {
        console.log('Coluna resume_id nao existe!');
      }
    } else {
      console.log('Encontrada: ' + resumeFK.constraint_name);
      
      // Verificar se ja e SET NULL
      if (resumeFK.definition.includes('SET NULL')) {
        console.log('Constraint ja usa SET NULL - nada a fazer');
      } else {
        console.log('Removendo constraint antiga...');
        await client.query('ALTER TABLE applications DROP CONSTRAINT ' + resumeFK.constraint_name);
        
        console.log('Adicionando nova constraint com SET NULL...');
        await client.query(`
          ALTER TABLE applications 
          ADD CONSTRAINT ${resumeFK.constraint_name} 
          FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
        `);
        console.log('SUCESSO: Constraint atualizada para SET NULL');
      }
    }
    
    await client.query('COMMIT');
    console.log('============================================================');
    console.log('MIGRACAO CONCLUIDA COM SUCESSO!');
    console.log('============================================================');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('ERRO: ' + error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

migrate();
