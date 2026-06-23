import pool from '../config/database.js';

async function ensureSchoolColumns() {
  const client = await pool.connect();
  try {
    const queries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_type VARCHAR(120)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_director VARCHAR(120)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_contact_phone VARCHAR(40)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_city VARCHAR(120)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_state VARCHAR(60)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_website VARCHAR(255)`
    ];

    for (const q of queries) {
      await client.query(q);
    }

    console.log('School columns ensured (if they did not exist they were added).');
  } catch (err) {
    console.error('Failed to ensure school columns:', err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  ensureSchoolColumns().then(() => process.exit());
}

export default ensureSchoolColumns;
