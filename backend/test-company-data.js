import pool from './config/database.js';

async function testCompanyData() {
  try {
    console.log('🔍 Testando dados da empresa aec139e6-8b98-48f3-b24f-ed6ce4b4eea4...');
    
    const result = await pool.query(`
      SELECT id, email, company_name, phone, cnpj, bio, location, created_at
      FROM users 
      WHERE id = $1 AND type = 'company' AND disabled = FALSE
    `, ['aec139e6-8b98-48f3-b24f-ed6ce4b4eea4']);

    if (result.rows.length > 0) {
      console.log('✅ Dados da empresa encontrados:');
      const company = result.rows[0];
      console.log({
        id: company.id,
        company_name: company.company_name,
        email: company.email,
        phone: company.phone,
        cnpj: company.cnpj,
        bio: company.bio,
        location: company.location
      });
      
      console.log('\n📋 Verificando se todos os campos obrigatórios existem:');
      console.log('- company_name:', company.company_name ? '✅' : '❌');
      console.log('- email:', company.email ? '✅' : '❌');
      console.log('- id:', company.id ? '✅' : '❌');
    } else {
      console.log('❌ Empresa não encontrada!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar dados da empresa:', error);
  } finally {
    pool.end();
  }
}

testCompanyData();
