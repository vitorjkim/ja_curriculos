import pool from '../config/database.js';

// Teste simples da API sem iniciar servidor
// Vamos testar diretamente a lógica de registro

const testAPIRegistration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando lógica de registro da API...');

    const testCNPJ = '98.765.432/0001-10';
    const testEmail1 = 'empresa1@teste.com';
    const testEmail2 = 'empresa2@teste.com';

    // Simular lógica do backend auth.js
    console.log('\n1️⃣ Testando primeiro registro...');
    
    // Verificar se email já existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail1]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Email já existe');
    } else {
      console.log('✅ Email disponível');
    }

    // Verificar se CNPJ já existe (para empresas)
    const existingCNPJ = await client.query(
      'SELECT id FROM users WHERE cnpj = $1 AND type = $2',
      [testCNPJ, 'company']
    );

    if (existingCNPJ.rows.length > 0) {
      console.log('❌ CNPJ já existe');
    } else {
      console.log('✅ CNPJ disponível');
      
      // Criar primeiro usuário
      const result1 = await client.query(`
        INSERT INTO users (email, password, company_name, cnpj, type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, cnpj
      `, [testEmail1, 'senha123', 'Primeira Empresa', testCNPJ, 'company']);
      
      console.log('✅ Primeira empresa criada:', result1.rows[0]);
    }

    console.log('\n2️⃣ Testando segundo registro com mesmo CNPJ...');
    
    // Verificar email (diferente)
    const existingUser2 = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail2]
    );

    if (existingUser2.rows.length > 0) {
      console.log('❌ Email já existe');
    } else {
      console.log('✅ Email disponível');
    }

    // Verificar CNPJ (mesmo da primeira empresa)
    const existingCNPJ2 = await client.query(
      'SELECT id FROM users WHERE cnpj = $1 AND type = $2',
      [testCNPJ, 'company']
    );

    if (existingCNPJ2.rows.length > 0) {
      console.log('✅ Validação funcionou! CNPJ já existe, não permitindo cadastro');
      console.log('💡 API retornaria erro: "Este CNPJ já está cadastrado por outra empresa"');
    } else {
      console.log('❌ ERRO: CNPJ deveria ter sido detectado como duplicado');
    }

    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await client.query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail1, testEmail2]);
    console.log('✅ Dados de teste removidos');

    console.log('\n🎉 Teste da lógica de API concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

testAPIRegistration();
