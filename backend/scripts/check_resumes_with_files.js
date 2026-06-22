import pool from '../config/database.js';

const run = async () => {
  try {
    const res = await pool.query("SELECT id, title, original_file_path, original_file_name, created_at FROM resumes WHERE original_file_path IS NOT NULL ORDER BY created_at DESC LIMIT 20");
    console.log('Found', res.rows.length, 'resumes with files');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying resumes:', err);
    process.exit(1);
  }
};

run();
