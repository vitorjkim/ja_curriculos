import pool from '../config/database.js';

async function checkCategories() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name LIKE '%categor%';
    `);
    
    console.log('🔍 Colunas relacionadas a categoria:');
    if (result.rows.length === 0) {
      console.log('  ❌ Nenhuma coluna de categoria encontrada');
      
      // Vamos ver todas as colunas para ter certeza
      const allCols = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Todas as colunas da tabela jobs:');
      allCols.rows.forEach(col => {
        console.log(`  - ${col.column_name}`);
      });
      
    } else {
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkCategories();
