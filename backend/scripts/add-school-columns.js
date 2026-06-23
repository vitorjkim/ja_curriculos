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
        ,`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_agency BOOLEAN DEFAULT FALSE`
    ];

    for (const q of queries) {
      try {
        console.log('Running:', q.replace(/\s+/g, ' ').trim());
        await client.query(q);
        console.log('OK');
      } catch (e) {
        console.error('Query failed:', e.message || e);
      }
    }

    console.log('Finished running ALTER TABLE statements.');
  } catch (err) {
    console.error('Failed to ensure school columns:', err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

// Execute when run directly
ensureSchoolColumns().then(() => process.exit()).catch(() => process.exit(1));

export default ensureSchoolColumns;
