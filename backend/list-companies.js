import pool from './config/database.js';

async function listCompanies() {
  try {
    console.log('🔍 Listando empresas no sistema...');
    
    const result = await pool.query(`
      SELECT id, email, company_name, phone, cnpj, bio, location, created_at
      FROM users 
      WHERE type = 'company'
      ORDER BY created_at DESC;
    `);
    
    console.log(`📋 Encontradas ${result.rows.length} empresas:`);
    
    result.rows.forEach((company, index) => {
      console.log(`\n${index + 1}. ${company.company_name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Email: ${company.email}`);
      console.log(`   Telefone: ${company.phone || 'N/A'}`);
      console.log(`   CNPJ: ${company.cnpj || 'N/A'}`);
      console.log(`   Bio: ${company.bio || 'N/A'}`);
      console.log(`   Localização: ${company.location || 'N/A'}`);
      console.log(`   Criado em: ${company.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar empresas:', error);
  } finally {
    pool.end();
  }
}

listCompanies();
