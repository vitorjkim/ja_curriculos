import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

async function migrate() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('🚀 Running migration: Adding AI Analysis columns...');

    // Adicionar coluna para armazenar o JSON da análise
    console.log('Adding column: ai_analysis (jsonb)');
    await client.query(`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
    `);

    // Adicionar coluna para a data da análise
    console.log('Adding column: ai_analyzed_at (timestamptz)');
    await client.query(`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
    `);

    // Adicionar coluna para o score geral para facilitar consultas
    console.log('Adding column: ai_analysis_score (integer)');
    await client.query(`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS ai_analysis_score INTEGER;
    `);

    console.log('✅ Migration completed successfully!');
    await client.end();
  } catch (err) {
    console.error('❌ Error running migration:', err);
    await client.end();
    process.exit(1);
  }
}

migrate();
