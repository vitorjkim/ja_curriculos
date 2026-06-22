import pool from '../config/database.js';

// Script para testar a validação de CNPJ único

const testCNPJValidation = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando validação de CNPJ único...');

    // Primeiro, vamos tentar criar uma empresa de teste
    const testCNPJ = '12.345.678/0001-95';
    const testEmail1 = 'teste1@teste.com';
    const testEmail2 = 'teste2@teste.com';

    console.log('\n1️⃣ Criando primeira empresa com CNPJ:', testCNPJ);
    
    try {
      const result1 = await client.query(`
        INSERT INTO users (email, password, company_name, cnpj, type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, cnpj
      `, [testEmail1, 'teste123', 'Empresa Teste 1', testCNPJ, 'company']);
      
      console.log('✅ Primeira empresa criada com sucesso:', result1.rows[0]);
    } catch (error) {
      console.log('❌ Erro ao criar primeira empresa:', error.message);
    }

    console.log('\n2️⃣ Tentando criar segunda empresa com o mesmo CNPJ...');
    
    try {
      const result2 = await client.query(`
        INSERT INTO users (email, password, company_name, cnpj, type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, cnpj
      `, [testEmail2, 'teste123', 'Empresa Teste 2', testCNPJ, 'company']);
      
      console.log('❌ ERRO: Segunda empresa foi criada (não deveria):', result2.rows[0]);
    } catch (error) {
      console.log('✅ Validação funcionou! Erro esperado:', error.message);
    }

    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await client.query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail1, testEmail2]);
    console.log('✅ Dados de teste removidos');

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

testCNPJValidation();
