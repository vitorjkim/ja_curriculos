import pool from './config/database.js';

async function fixCompanyNames() {
  try {
    await pool.query(`
      UPDATE users 
      SET company_name = 'Empresa Exemplo' 
      WHERE email = 'empresa@exemplo.com'
    `);
    
    await pool.query(`
      UPDATE users 
      SET company_name = 'Empresa 2' 
      WHERE email = 'empresa2@gmail.com'
    `);
    
    console.log('✅ Nomes das empresas atualizados!');
    
    // Verificar se funcionou
    const result = await pool.query(`SELECT id, email, company_name, location FROM users WHERE type = 'company'`);
    console.log('🏢 Empresas após correção:');
    result.rows.forEach(row => {
      console.log(`Email: ${row.email}`);
      console.log(`Nome: ${row.company_name || 'NULL'}`);
      console.log(`Localização: ${row.location || 'NULL'}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

fixCompanyNames();
