const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

async function checkUserTable() {
  console.log('🔍 Verificando estrutura da tabela users...\n');
  
  try {
    // Verificar colunas da tabela users
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const columns = await pool.query(columnsQuery);
    
    console.log('📊 Colunas da tabela users:');
    columns.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🔍 Verificando se existem colunas de escola...');
    const schoolColumns = columns.rows.filter(col => col.column_name.includes('school'));
    
    if (schoolColumns.length > 0) {
      console.log('✅ Colunas de escola encontradas:');
      schoolColumns.forEach(col => {
        console.log(`   - ${col.column_name}`);
      });
    } else {
      console.log('❌ Nenhuma coluna de escola encontrada!');
      console.log('\n🛠️  Será necessário adicionar as colunas:');
      console.log('   - school_name');
      console.log('   - school_type');  
      console.log('   - school_cnpj');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserTable();
