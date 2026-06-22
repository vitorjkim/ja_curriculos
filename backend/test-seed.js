import pool from './config/database.js';

const testSeed = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando estrutura da tabela resumes...\n');
    
    // Verificar a estrutura exata da tabela
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default, ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'resumes' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela resumes:');
    columnsResult.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- NOT NULL' : ''} ${col.column_default ? `- DEFAULT: ${col.column_default}` : ''}`);
    });
    
    // Tentar inserir um registro simples
    console.log('\n🔬 Tentando inserção simples...');
    
    // Primeiro, criar um usuário de teste
    const testUserResult = await client.query(`
      INSERT INTO users (email, password, name, type)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['teste@teste.com', 'hash123', 'Usuário Teste', 'candidate']);
    
    const testUserId = testUserResult.rows[0].id;
    console.log(`✅ Usuário teste criado com ID: ${testUserId}`);
    
    // Tentar inserir currículo
    const insertResult = await client.query(`
      INSERT INTO resumes (user_id, title)
      VALUES ($1, $2)
      RETURNING id
    `, [testUserId, 'Teste']);
    
    console.log(`✅ Currículo teste criado com ID: ${insertResult.rows[0].id}`);
    
    // Limpar dados de teste
    await client.query('DELETE FROM resumes WHERE user_id = $1', [testUserId]);
    await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('✅ Dados de teste removidos');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

testSeed();
