/**
 * Script para verificar constraints FK da tabela applications
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function check() {
  const client = await pool.connect();
  let output = [];
  
  try {
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
    
    output.push('='.repeat(60));
    output.push('CONSTRAINTS FK DA TABELA APPLICATIONS');
    output.push('='.repeat(60));
    
    fkResult.rows.forEach(row => {
      output.push('');
      output.push('Nome: ' + row.constraint_name);
      output.push('Definicao: ' + row.definition);
      
      if (row.definition.includes('resume')) {
        if (row.definition.includes('SET NULL')) {
          output.push('>>> STATUS: OK - Usa SET NULL');
        } else if (row.definition.includes('CASCADE')) {
          output.push('>>> STATUS: PROBLEMA - Usa CASCADE!');
        } else {
          output.push('>>> STATUS: Verificar manualmente');
        }
      }
    });
    
    output.push('');
    output.push('='.repeat(60));
    
  } catch (error) {
    output.push('ERRO: ' + error.message);
  } finally {
    client.release();
    await pool.end();
    
    const result = output.join('\n');
    const resultPath = path.join(__dirname, 'constraint-check-result.txt');
    fs.writeFileSync(resultPath, result, 'utf8');
    console.log(result);
    console.log('\nResultado salvo em: ' + resultPath);
  }
}

check();
