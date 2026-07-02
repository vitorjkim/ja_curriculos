import pool from './config/database.js';

(async () => {
  try {
    console.log('\n📋 Tabelas no banco de dados:\n');
    
    const tablesRes = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    tablesRes.rows.forEach(row => console.log(`   ${row.tablename}`));
    
    // Check students table structure
    console.log('\n📚 Estrutura da tabela "students":\n');
    const colsRes = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'students'
      ORDER BY ordinal_position
    `);
    
    colsRes.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Count records
    console.log('\n📊 Total de registros:\n');
    
    const tableNames = ['users', 'students', 'jobs', 'applications', 'resumes', 'schools'];
    
    for (const table of tableNames) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${countRes.rows[0].count} registros`);
      } catch (err) {
        console.log(`   ${table}: Erro ao contar`);
      }
    }
    
    // Get schools
    console.log('\n🏫 Escolas disponíveis:\n');
    const schoolsRes = await pool.query('SELECT id, name FROM schools LIMIT 5');
    schoolsRes.rows.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.name} (${s.id})`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
