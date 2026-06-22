import pool from './config/database.js';

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('Colunas na tabela users:');
    result.rows.forEach(row => console.log(' -', row.column_name));
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

checkColumns();
