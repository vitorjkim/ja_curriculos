import pool from './config/database.js';

async function checkSchoolFields() {
  try {
    const result = await pool.query(`
      SELECT school_name, school_type, school_director, school_contact_phone, school_city, school_state 
      FROM users WHERE email = 'escola@exemplo.com'
    `);
    
    console.log('🔍 Campos da escola no banco:');
    console.log(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchoolFields();
