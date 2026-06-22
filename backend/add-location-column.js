import pool from './config/database.js';

async function addLocationColumn() {
  try {
    console.log('🔧 Adicionando coluna location à tabela users...');
    
    // Verificar se a coluna já existe
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'location';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Coluna location já existe!');
      return;
    }
    
    // Adicionar a coluna location
    await pool.query('ALTER TABLE users ADD COLUMN location VARCHAR(255);');
    
    console.log('✅ Coluna location adicionada com sucesso!');
    
    // Verificar a estrutura final
    const finalResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'location';
    `);
    
    if (finalResult.rows.length > 0) {
      console.log('✅ Verificação final: coluna location existe');
      console.log(`   Tipo: ${finalResult.rows[0].data_type}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna location:', error);
  } finally {
    pool.end();
  }
}

addLocationColumn();
