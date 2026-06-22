/**
 * Migração SIMPLES: Corrigir a constraint ON DELETE CASCADE para ON DELETE SET NULL
 * Escreve resultado em arquivo para evitar confusão com logs do servidor
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const log = [];
const logLine = (msg) => {
  log.push(msg);
  console.log(msg);
};

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
    logLine('='.repeat(60));
    logLine('MIGRACAO: Corrigir constraint de resume_id');
    logLine('='.repeat(60));
    
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
    
    logLine('Constraints FK encontradas:');
    fkResult.rows.forEach(row => {
      logLine(`  - ${row.constraint_name}: ${row.definition}`);
    });
    
    // Encontrar a constraint de resume_id
    const resumeFK = fkResult.rows.find(row => 
      row.definition.includes('resume_id') || row.constraint_name.includes('resume')
    );
    
    if (!resumeFK) {
      logLine('AVISO: Nenhuma FK para resume_id encontrada');
      
      // Verificar se coluna existe
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'resume_id'
      `);
      
      if (colCheck.rows.length > 0) {
        logLine('Coluna resume_id existe. Adicionando constraint...');
        await client.query(`
          ALTER TABLE applications 
          ADD CONSTRAINT applications_resume_id_fkey 
          FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
        `);
        logLine('SUCESSO: Constraint adicionada com SET NULL');
      }
    } else {
      logLine(`Encontrada: ${resumeFK.constraint_name}`);
      
      // Verificar se ja e SET NULL
      if (resumeFK.definition.includes('SET NULL')) {
        logLine('Constraint ja usa SET NULL - nada a fazer');
      } else {
        logLine('Removendo constraint antiga...');
        await client.query(`ALTER TABLE applications DROP CONSTRAINT ${resumeFK.constraint_name}`);
        
        logLine('Adicionando nova constraint com SET NULL...');
        await client.query(`
          ALTER TABLE applications 
          ADD CONSTRAINT ${resumeFK.constraint_name} 
          FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
        `);
        logLine('SUCESSO: Constraint atualizada para SET NULL');
      }
    }
    
    await client.query('COMMIT');
    logLine('='.repeat(60));
    logLine('MIGRACAO CONCLUIDA COM SUCESSO!');
    logLine('='.repeat(60));
    
  } catch (error) {
    await client.query('ROLLBACK');
    logLine('ERRO: ' + error.message);
  } finally {
    client.release();
    await pool.end();
    
    // Escrever log em arquivo
    const logPath = join(__dirname, 'migration-result.txt');
    writeFileSync(logPath, log.join('\n'));
    console.log(`\nLog salvo em: ${logPath}`);
  }
}

migrate();
