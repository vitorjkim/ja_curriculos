import pool from './config/database.js';

(async () => {
  try {
    await pool.query('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false');
    console.log('✅ Campo is_default adicionado à tabela resumes');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
})();
