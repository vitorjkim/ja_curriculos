import pool from './config/database.js';

const resetCompleteDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('💥 RESET COMPLETO DO BANCO DE DADOS');
    console.log('=====================================\n');
    
    // 1. Remover todas as conexões ativas
    console.log('🔌 Terminando conexões ativas...');
    try {
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = current_database()
          AND pid <> pg_backend_pid()
      `);
      console.log('   ✅ Conexões terminadas');
    } catch (error) {
      console.log('   ⚠️  Sem conexões para terminar');
    }
    
    // 2. Dropar todas as tabelas com CASCADE
    console.log('\n🗑️  Removendo todas as tabelas...');
    const allTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    for (const table of allTablesResult.rows) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
        console.log(`   ✅ ${table.tablename}`);
      } catch (error) {
        console.log(`   ❌ Erro ao remover ${table.tablename}: ${error.message}`);
      }
    }
    
    // 3. Remover todas as sequences
    console.log('\n📊 Removendo sequences...');
    const sequencesResult = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequencesResult.rows) {
      try {
        await client.query(`DROP SEQUENCE IF EXISTS "${seq.sequence_name}" CASCADE`);
        console.log(`   ✅ ${seq.sequence_name}`);
      } catch (error) {
        console.log(`   ❌ Erro: ${seq.sequence_name}`);
      }
    }
    
    // 4. Remover todas as funções personalizadas
    console.log('\n🔧 Removendo funções personalizadas...');
    const functionsResult = await client.query(`
      SELECT routine_name, routine_schema
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_name NOT LIKE 'uuid_%'
    `);
    
    for (const func of functionsResult.rows) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS "${func.routine_name}"() CASCADE`);
        console.log(`   ✅ ${func.routine_name}`);
      } catch (error) {
        console.log(`   ❌ Erro: ${func.routine_name}`);
      }
    }
    
    // 5. Remover triggers
    console.log('\n⚡ Removendo triggers...');
    const triggersResult = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);
    
    for (const trigger of triggersResult.rows) {
      try {
        await client.query(`DROP TRIGGER IF EXISTS "${trigger.trigger_name}" ON "${trigger.event_object_table}" CASCADE`);
        console.log(`   ✅ ${trigger.trigger_name} em ${trigger.event_object_table}`);
      } catch (error) {
        console.log(`   ❌ Erro: ${trigger.trigger_name}`);
      }
    }
    
    // 6. Remover extensões (mas manter as básicas)
    console.log('\n🧩 Removendo extensões...');
    try {
      await client.query('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE');
      console.log('   ✅ uuid-ossp removida');
    } catch (error) {
      console.log('   ⚠️  uuid-ossp não encontrada');
    }
    
    // 7. Verificação final
    console.log('\n🔍 Verificação final...');
    
    const finalTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const finalSequences = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    const finalFunctions = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_name NOT LIKE 'uuid_%'
    `);
    
    console.log(`   📋 Tabelas restantes: ${finalTables.rows.length}`);
    console.log(`   📊 Sequences restantes: ${finalSequences.rows.length}`);
    console.log(`   🔧 Funções restantes: ${finalFunctions.rows.length}`);
    
    if (finalTables.rows.length === 0 && finalSequences.rows.length === 0 && finalFunctions.rows.length === 0) {
      console.log('\n🎉 BANCO COMPLETAMENTE LIMPO!');
      console.log('✅ Pronto para recriação completa');
    } else {
      console.log('\n⚠️  Alguns objetos ainda permanecem:');
      finalTables.rows.forEach(t => console.log(`   - Tabela: ${t.table_name}`));
      finalSequences.rows.forEach(s => console.log(`   - Sequence: ${s.sequence_name}`));
      finalFunctions.rows.forEach(f => console.log(`   - Função: ${f.routine_name}`));
    }
    
  } catch (error) {
    console.error('❌ Erro durante reset completo:', error);
    throw error;
  } finally {
    client.release();
    console.log('\n🔌 Conexão liberada');
    await pool.end();
    console.log('💤 Pool de conexões encerrado');
  }
};

resetCompleteDatabase().then(() => {
  console.log('\n🚀 Reset completo finalizado! Você pode agora reiniciar o servidor.');
}).catch((error) => {
  console.error('💥 Falha no reset:', error);
  process.exit(1);
});
