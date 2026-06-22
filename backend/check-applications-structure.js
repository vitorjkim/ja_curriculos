import pool from './config/database.js';

async function checkApplicationsTable() {
  try {
    console.log('🔍 Verificando estrutura da tabela applications...');
    
    const client = await pool.connect();
    
    // Verificar colunas da tabela
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'applications' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas da tabela applications:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar dados de exemplo
    const dataResult = await client.query('SELECT * FROM applications LIMIT 3');
    console.log('\n📄 Dados de exemplo:');
    console.log(dataResult.rows);
    
    client.release();
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error.message);
  } finally {
    process.exit(0);
  }
}

checkApplicationsTable();
