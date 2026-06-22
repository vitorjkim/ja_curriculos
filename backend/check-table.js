import pool from './config/database.js';

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura da tabela users...');
  
  const client = await pool.connect();
  
  try {
    // Consultar estrutura da tabela
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Colunas da tabela users:');
    result.rows.forEach(column => {
      console.log(`  - ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Verificar alguns registros existentes
    const dataResult = await client.query('SELECT email, type FROM users LIMIT 5');
    console.log('\n👥 Usuários existentes:');
    dataResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.type})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar verificação
checkTableStructure().catch(console.error);
