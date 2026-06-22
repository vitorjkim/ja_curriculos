import pool from '../config/database.js';

// Script para adicionar constraint única para CNPJ

const addCNPJUniqueConstraint = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Adicionando constraint única para CNPJ...');

    // Primeiro, vamos verificar se já existe a constraint
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name = 'users_cnpj_unique'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('⚠️  Constraint única para CNPJ já existe');
      return;
    }

    // Verificar se existem CNPJs duplicados antes de adicionar a constraint
    const duplicateCheck = await client.query(`
      SELECT cnpj, COUNT(*) as count
      FROM users 
      WHERE cnpj IS NOT NULL 
      AND cnpj != '' 
      AND type = 'company'
      GROUP BY cnpj 
      HAVING COUNT(*) > 1
    `);

    if (duplicateCheck.rows.length > 0) {
      console.log('❌ Existem CNPJs duplicados no banco. Dados encontrados:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   CNPJ: ${row.cnpj} - ${row.count} empresas`);
      });
      
      console.log('\nPor favor, remova os CNPJs duplicados antes de executar este script.');
      console.log('Você pode usar o script cleanup-duplicate-cnpj.js para isso.');
      return;
    }

    // Adicionar constraint única para CNPJ
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_cnpj_unique 
      UNIQUE (cnpj)
    `);

    // Adicionar índice para melhor performance em consultas por CNPJ
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_cnpj ON users(cnpj) 
      WHERE cnpj IS NOT NULL AND cnpj != ''
    `);

    console.log('✅ Constraint única para CNPJ adicionada com sucesso!');
    console.log('✅ Índice para CNPJ criado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao adicionar constraint única para CNPJ:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

addCNPJUniqueConstraint();
