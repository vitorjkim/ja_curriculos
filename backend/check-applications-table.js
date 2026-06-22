import pool from './config/database.js';

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'applications'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 Colunas da tabela applications:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
})();
