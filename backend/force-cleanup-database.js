import pool from './config/database.js';

const forceCleanupDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('💥 Limpeza forçada do banco de dados...\n');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    console.log('🔍 Tabelas encontradas:', tablesResult.rows.map(r => r.table_name));
    
    // Drop all tables with CASCADE to handle foreign keys
    for (const table of tablesResult.rows) {
      try {
        await client.query(`DROP TABLE "${table.table_name}" CASCADE`);
        console.log(`   ✅ Removida: ${table.table_name}`);
      } catch (error) {
        console.log(`   ❌ Erro ao remover ${table.table_name}:`, error.message);
      }
    }
    
    // Drop all sequences
    const sequencesResult = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequencesResult.rows) {
      try {
        await client.query(`DROP SEQUENCE "${seq.sequence_name}" CASCADE`);
        console.log(`   ✅ Sequence removida: ${seq.sequence_name}`);
      } catch (error) {
        console.log(`   ❌ Erro ao remover sequence ${seq.sequence_name}:`, error.message);
      }
    }
    
    // Drop extension and recreate to ensure clean state
    try {
      await client.query('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE');
      console.log('   ✅ Extensão uuid-ossp removida');
    } catch (error) {
      console.log('   - uuid-ossp não encontrada');
    }
    
    // Final verification
    const finalCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    console.log(`\n🎯 Resultado final: ${finalCheck.rows.length} tabelas restantes`);
    if (finalCheck.rows.length > 0) {
      console.log('Tabelas restantes:', finalCheck.rows.map(r => r.table_name));
    } else {
      console.log('✅ Banco completamente limpo!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante limpeza forçada:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

forceCleanupDatabase();
