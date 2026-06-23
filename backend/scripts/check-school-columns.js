import pool from '../config/database.js';

async function checkColumns() {
  const client = await pool.connect();
  try {
    const cols = [
      'school_name',
      'school_type',
      'school_director',
      'school_contact_phone',
      'school_city',
      'school_state',
      'school_website'
    ];

    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = ANY($1)
    `, [cols]);

    const found = new Set(res.rows.map(r => r.column_name));

    for (const c of cols) {
      console.log(`${c}: ${found.has(c) ? 'FOUND' : 'MISSING'}`);
    }

  } catch (err) {
    console.error('Error checking columns:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute when run directly
checkColumns().then(() => process.exit()).catch(() => process.exit(1));

export default checkColumns;
