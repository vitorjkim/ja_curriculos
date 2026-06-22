import pool from './config/database.js';

async function checkUsersStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Colunas da tabela users:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🔍 Verificando se a coluna location existe...');
    const locationExists = result.rows.some(row => row.column_name === 'location');
    
    if (locationExists) {
      console.log('✅ Coluna location existe!');
    } else {
      console.log('❌ Coluna location não existe!');
      console.log('💡 Será necessário adicionar a coluna location à tabela users.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    pool.end();
  }
}

checkUsersStructure();
