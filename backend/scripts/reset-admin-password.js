import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

async function reset() {
  const client = await pool.connect();
  try {
    const newHash = await bcrypt.hash('admin123', 10);
    const res = await client.query(`UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id,email`, [newHash, 'admin@curriculoja.com']);
    if (res.rows.length === 0) {
      console.log('Admin not found');
    } else {
      console.log('Admin password reset for:', res.rows[0].email);
    }
  } catch (e) {
    console.error('Reset failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
