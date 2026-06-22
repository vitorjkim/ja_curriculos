import pool from './config/database.js';

const checkDatabaseState = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estado atual do banco de dados...\n');
    
    // Verificar se existem tabelas
    const tablesResult = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas existentes:');
    if (tablesResult.rows.length === 0) {
      console.log('   Nenhuma tabela encontrada');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    // Verificar colunas das tabelas existentes
    for (const table of tablesResult.rows) {
      console.log(`\n🔍 Estrutura da tabela ${table.table_name}:`);
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
      });
    }
    
    // Verificar índices
    console.log('\n📊 Índices existentes:');
    const indexesResult = await client.query(`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    if (indexesResult.rows.length === 0) {
      console.log('   Nenhum índice encontrado');
    } else {
      indexesResult.rows.forEach(idx => {
        console.log(`   - ${idx.indexname} em ${idx.tablename}`);
      });
    }
    
    // Verificar constraints/chaves estrangeiras
    console.log('\n🔗 Constraints existentes:');
    const constraintsResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type
    `);
    
    if (constraintsResult.rows.length === 0) {
      console.log('   Nenhuma constraint encontrada');
    } else {
      constraintsResult.rows.forEach(constraint => {
        const info = `${constraint.constraint_name} (${constraint.constraint_type}) em ${constraint.table_name}.${constraint.column_name}`;
        if (constraint.foreign_table_name) {
          console.log(`   - ${info} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
        } else {
          console.log(`   - ${info}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar estado do banco:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

checkDatabaseState();
