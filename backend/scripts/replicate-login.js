import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

async function replicate() {
  const client = await pool.connect();
  try {
    const email = 'admin@curriculoja.com';
    const password = 'admin123';

    const result = await client.query(`
      SELECT 
        id, email, password, name, company_name, type, is_admin, disabled, 
        subscription_plan, subscription_status,
        school_name, school_type, school_contact_phone, 
        school_city, school_state, school_website,
        profile_image, is_agency
      FROM users WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      console.log('No user found');
      return;
    }

    const user = result.rows[0];
    console.log('User fetched:', Object.keys(user));

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);

  } catch (e) {
    console.error('Replicate error:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

replicate();
