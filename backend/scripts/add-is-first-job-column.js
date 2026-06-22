import pool from '../config/database.js';

async function addIsFirstJobColumn() {
  try {
    // Adicionar a coluna is_first_job
    await pool.query(`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS is_first_job BOOLEAN DEFAULT false;
    `);
    
    console.log('✅ Coluna is_first_job adicionada com sucesso!');
    
    // Verificar a estrutura atualizada
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name = 'is_first_job';
    `);
    
    if (result.rows.length > 0) {
      console.log('📋 Nova coluna criada:');
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error.message);
    process.exit(1);
  }
}

addIsFirstJobColumn();
