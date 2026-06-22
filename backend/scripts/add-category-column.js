import pool from '../config/database.js';

async function addCategoryColumn() {
  try {
    // Adicionar a coluna category
    await pool.query(`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    `);
    
    console.log('✅ Coluna category adicionada com sucesso!');
    
    // Verificar a estrutura atualizada
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name = 'category';
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

addCategoryColumn();
