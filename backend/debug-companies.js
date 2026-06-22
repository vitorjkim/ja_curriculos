import pool from './config/database.js';

async function checkCompany() {
  try {
    const result = await pool.query(`SELECT id, email, company_name, location FROM users WHERE type = 'company'`);
    console.log('🏢 Empresas no banco:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
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

checkCompany();
