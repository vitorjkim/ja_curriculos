import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
const targetEmail = process.env.TARGET_EMAIL || 'vitoreojoaquim@gmail.com';

const run = async () => {
  try {
    const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [targetEmail]);
    if (userRes.rows.length === 0) {
      console.error('User not found for email:', targetEmail);
      process.exit(1);
    }

    const userId = userRes.rows[0].id;
    console.log('Will import files for user:', userId, targetEmail);

    const files = fs.readdirSync(uploadsDir).filter(f => f.startsWith('resume-'));
    if (files.length === 0) {
      console.log('No resume files found in uploads.');
      process.exit(0);
    }

    for (const fileName of files) {
      console.log('Processing', fileName);
      const originalFileName = fileName.replace(/^resume-\d+-\d+/, fileName);
      const personalInfo = {
        name: null,
        email: null,
        phone: null,
        originalFileName: fileName
      };

      const insert = `INSERT INTO resumes (
        user_id, title, template, is_public, personal_info, experience, education, skills, languages, projects, courses, original_file_path, original_file_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;

      const values = [
        userId,
        `Currículo - ${fileName}`,
        'uploaded',
        true,
        JSON.stringify(personalInfo),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        fileName,
        fileName
      ];

      const res = await pool.query(insert, values);
      console.log('Inserted resume id:', res.rows[0].id);
    }

    console.log('Done importing', files.length, 'files.');
    process.exit(0);
  } catch (err) {
    console.error('Error importing files:', err);
    process.exit(1);
  }
};

run();
