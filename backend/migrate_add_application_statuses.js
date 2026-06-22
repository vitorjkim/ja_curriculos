import pool from './config/database.js';

// Migração para ampliar statuses e adicionar campos de entrevista sem perder dados.
(async () => {
  console.log('🚀 Iniciando migração de applications...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remover constraint antiga se existir
    // Nome pode variar; tentamos detectar
    const cons = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'applications'::regclass
        AND conname ILIKE '%status%check%'
    `);
    for (const row of cons.rows) {
      console.log('🔧 Removendo constraint antiga:', row.conname);
      await client.query(`ALTER TABLE applications DROP CONSTRAINT IF EXISTS ${row.conname}`);
    }

    // Adicionar colunas se não existem
    await client.query(`ALTER TABLE applications 
      ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(50),
      ADD COLUMN IF NOT EXISTS interview_location VARCHAR(200),
      ADD COLUMN IF NOT EXISTS interview_link TEXT,
      ADD COLUMN IF NOT EXISTS interview_notes TEXT,
      ADD COLUMN IF NOT EXISTS interview_confirmed BOOLEAN DEFAULT FALSE`);

    // Nova constraint de status
    await client.query(`ALTER TABLE applications 
      ADD CONSTRAINT applications_status_check 
      CHECK (status IN ('pending','reviewing','interested','interview','approved','rejected'))`);

    console.log('✅ Migração concluída com sucesso.');
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Falha na migração:', e.message);
  } finally {
    client.release();
    process.exit(0);
  }
})();