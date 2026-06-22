import pool from './config/database.js';

const cleanupDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Iniciando limpeza do banco de dados...\n');
    
    // First, drop all tables to avoid foreign key conflicts
    console.log('❌ Removendo tabelas existentes...');
    
    const dropTablesQueries = [
      // Drop new schema tables first (they might have FK to old ones)
      'DROP TABLE IF EXISTS applications CASCADE',
      'DROP TABLE IF EXISTS jobs CASCADE',
      'DROP TABLE IF EXISTS resumes CASCADE',
      'DROP TABLE IF EXISTS user_sessions CASCADE',
      'DROP TABLE IF EXISTS journey_progress CASCADE',
      'DROP TABLE IF EXISTS activity_logs CASCADE',
      'DROP TABLE IF EXISTS refresh_tokens CASCADE',
      'DROP TABLE IF EXISTS candidate_profiles CASCADE',
      'DROP TABLE IF EXISTS company_profiles CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      
      // Drop old schema tables
      'DROP TABLE IF EXISTS Applications CASCADE',
      'DROP TABLE IF EXISTS Jobs CASCADE', 
      'DROP TABLE IF EXISTS Resumes CASCADE',
      'DROP TABLE IF EXISTS Companies CASCADE',
      'DROP TABLE IF EXISTS Users CASCADE'
    ];
    
    for (const query of dropTablesQueries) {
      try {
        await client.query(query);
        console.log(`   ✓ ${query.split(' ')[4]}`);
      } catch (error) {
        console.log(`   - ${query.split(' ')[4]} (já removida)`);
      }
    }
    
    // Drop any remaining sequences
    console.log('\n📊 Removendo sequences...');
    const sequencesResult = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequencesResult.rows) {
      try {
        await client.query(`DROP SEQUENCE IF EXISTS ${seq.sequence_name} CASCADE`);
        console.log(`   ✓ ${seq.sequence_name}`);
      } catch (error) {
        console.log(`   - ${seq.sequence_name} (erro ao remover)`);
      }
    }
    
    // Drop any remaining functions
    console.log('\n🔧 Removendo funções...');
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    `);
    
    for (const func of functionsResult.rows) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS ${func.routine_name}() CASCADE`);
        console.log(`   ✓ ${func.routine_name}`);
      } catch (error) {
        console.log(`   - ${func.routine_name} (erro ao remover)`);
      }
    }
    
    // Verify cleanup
    console.log('\n✅ Verificando limpeza...');
    const remainingTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (remainingTablesResult.rows.length === 0) {
      console.log('   ✅ Banco limpo com sucesso!');
    } else {
      console.log('   ⚠️  Tabelas restantes:');
      remainingTablesResult.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
    }
    
    console.log('\n🎯 Banco de dados limpo e pronto para nova inicialização!');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

cleanupDatabase();
