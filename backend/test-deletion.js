import pool from './config/database.js';

async function testUserDeletion() {
  console.log('🧪 Testando exclusão completa de usuários...');
  
  const client = await pool.connect();
  
  try {
    // 1. Listar usuários atuais
    console.log('\n📋 Usuários antes da exclusão:');
    const beforeResult = await client.query('SELECT id, email, type FROM users ORDER BY created_at');
    beforeResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.type}) [ID: ${user.id}]`);
    });

    // 2. Encontrar um usuário que não seja admin para deletar
    const testUser = beforeResult.rows.find(user => user.email === 'empresa@teste.com');
    
    if (!testUser) {
      console.log('\n⚠️  Usuário de teste não encontrado. Criando um...');
      
      // Criar usuário temporário para teste
      const newUserResult = await client.query(`
        INSERT INTO users (email, password, company_name, type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, email, company_name
      `, ['teste.delete@exemplo.com', 'hashedpass', 'Empresa para Deletar', 'company']);
      
      const createdUser = newUserResult.rows[0];
      console.log(`✅ Usuário criado: ${createdUser.email} [ID: ${createdUser.id}]`);
      
      // Testar exclusão do usuário criado
      await testDeletion(client, createdUser.id, createdUser.email);
    } else {
      console.log(`\n🎯 Testando exclusão de: ${testUser.email}`);
      await testDeletion(client, testUser.id, testUser.email);
    }

    // 3. Listar usuários após exclusão
    console.log('\n📋 Usuários após exclusão:');
    const afterResult = await client.query('SELECT id, email, type FROM users ORDER BY created_at');
    afterResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.type}) [ID: ${user.id}]`);
    });

    console.log(`\n📊 Total antes: ${beforeResult.rows.length}, Total depois: ${afterResult.rows.length}`);
    console.log(`✅ Diferença: ${beforeResult.rows.length - afterResult.rows.length} usuário(s) removido(s)`);

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function testDeletion(client, userId, userEmail) {
  try {
    // Verificar se o usuário existe
    const checkResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (checkResult.rows.length === 0) {
      console.log('⚠️  Usuário não existe para exclusão');
      return;
    }

    // Fazer a exclusão
    const deleteResult = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    
    if (deleteResult.rows.length > 0) {
      console.log(`✅ Usuário ${userEmail} excluído com sucesso do banco de dados`);
      
      // Verificar se realmente foi removido
      const verifyResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (verifyResult.rows.length === 0) {
        console.log('✅ Confirmado: Usuário completamente removido do banco');
      } else {
        console.log('❌ Erro: Usuário ainda existe no banco');
      }
    } else {
      console.log('❌ Nenhum usuário foi excluído');
    }
  } catch (error) {
    console.error('❌ Erro na exclusão:', error.message);
  }
}

// Executar teste
testUserDeletion().catch(console.error);
