import pool from '../config/database.js';

const run = async () => {
  try {
    await pool.query(`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_file_path TEXT;`);
    await pool.query(`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_file_name TEXT;`);
    console.log('✅ Columns added (or already present)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding columns:', err);
    process.exit(1);
  }
};

run();
