import pool from '../config/database.js';

const inspect = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT c.conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.contype = 'c'
    `);
    console.log('Constraints on users:');
    for (const row of res.rows) console.log(row.conname, '-', row.def);
  } catch (e) {
    console.error('Erro lendo constraints:', e);
  } finally {
    client.release();
    await pool.end();
  }
};
inspect();
