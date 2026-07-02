import pool from './config/database.js';

(async () => {
  try {
    const colsRes = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'applications'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📚 Estrutura da tabela "applications":\n');
    colsRes.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();
