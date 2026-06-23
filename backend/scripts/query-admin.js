import pool from '../config/database.js';

async function queryAdmin() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, email, type, is_admin, disabled, created_at FROM users WHERE email = $1", ['admin@curriculoja.com']);
    if (res.rows.length === 0) {
      console.log('Admin user not found');
    } else {
      console.log('Admin user rows:', res.rows);
    }
  } catch (e) {
    console.error('Query failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

queryAdmin();
