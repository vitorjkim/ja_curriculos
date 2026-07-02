import pool from './config/database.js';

(async () => {
  try {
    // Get check constraints
    const constraintsRes = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%applications%'
    `);
    
    console.log('\n🔍 Restrições CHECK na tabela applications:\n');
    if (constraintsRes.rows.length === 0) {
      console.log('   Nenhuma restrição CHECK encontrada');
    } else {
      constraintsRes.rows.forEach(c => {
        console.log(`   ${c.constraint_name}:`);
        console.log(`   ${c.check_clause}\n`);
      });
    }
    
    // Get distinct statuses from applications
    const statusRes = await pool.query(`
      SELECT DISTINCT status FROM applications ORDER BY status
    `);
    
    console.log('📊 Status utilizados nas aplicações:\n');
    statusRes.rows.forEach(s => {
      console.log(`   ${s.status}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();
