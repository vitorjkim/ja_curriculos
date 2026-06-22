const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'curriculoja',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function checkConstraints() {
  try {
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'jobs'::regclass AND contype = 'c'
    `);
    
    console.log('📋 Restrições de verificação da tabela jobs:');
    result.rows.forEach(row => {
      console.log(`\n${row.conname}:`);
      console.log(`  ${row.definition}`);
    });
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
