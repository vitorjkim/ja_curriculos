import pool from './config/database.js';
import bcrypt from 'bcryptjs';

async function testCompanyRegister() {
  console.log('🏢 Testando registro de empresa...');
  
  const client = await pool.connect();
  
  try {
    // Dados da empresa para teste
    const companyData = {
      email: 'empresa@teste.com',
      password: 'senha123',
      company_name: 'Empresa de Teste Ltda',
      company_sector: 'Tecnologia',
      company_size: 'medium',
      company_location: 'São Paulo, SP',
      company_description: 'Uma empresa para testes de cadastro',
      type: 'company'
    };

    // Hash da senha
    const hashedPassword = await bcrypt.hash(companyData.password, 12);

    // Verificar se email já existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [companyData.email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️ Email já existe no banco. Deletando para refazer o teste...');
      await client.query('DELETE FROM users WHERE email = $1', [companyData.email]);
    }

    // Insert na tabela users
    const result = await client.query(`
      INSERT INTO users (
        email, password, company_name, type
      ) VALUES ($1, $2, $3, $4) 
      RETURNING id, email, company_name, type, created_at
    `, [
      companyData.email,
      hashedPassword,
      companyData.company_name,
      companyData.type
    ]);

    const newCompany = result.rows[0];

    console.log('✅ Empresa registrada com sucesso!');
    console.log('📋 Dados da empresa:');
    console.log({
      id: newCompany.id,
      email: newCompany.email,
      company_name: newCompany.company_name,
      type: newCompany.type,
      created_at: newCompany.created_at
    });

    // Verificar login
    console.log('\n🔐 Testando login da empresa...');
    
    const loginResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [companyData.email]
    );

    if (loginResult.rows.length > 0) {
      const user = loginResult.rows[0];
      const passwordMatch = await bcrypt.compare(companyData.password, user.password);
      
      if (passwordMatch) {
        console.log('✅ Login funcionando! Senha está correta.');
      } else {
        console.log('❌ Senha incorreta no teste de login.');
      }
    } else {
      console.log('❌ Usuário não encontrado para login.');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Detalhes:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar teste
testCompanyRegister().catch(console.error);
