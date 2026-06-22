import pool from './config/database.js';

async function addIsFirstJobColumn() {
  try {
    console.log('🔧 Adicionando coluna is_first_job à tabela jobs...');
    
    // Verificar se a coluna já existe
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name = 'is_first_job';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Coluna is_first_job já existe!');
      return;
    }
    
    // Adicionar a coluna is_first_job
    await pool.query('ALTER TABLE jobs ADD COLUMN is_first_job BOOLEAN DEFAULT FALSE;');
    
    console.log('✅ Coluna is_first_job adicionada com sucesso!');
    
    // Verificar a estrutura final
    const finalResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name = 'is_first_job';
    `);
    
    if (finalResult.rows.length > 0) {
      console.log('✅ Verificação final: coluna is_first_job existe');
      console.log(`   Tipo: ${finalResult.rows[0].data_type}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna is_first_job:', error);
  } finally {
    pool.end();
  }
}

addIsFirstJobColumn();
