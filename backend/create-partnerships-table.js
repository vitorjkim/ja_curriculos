import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createPartnershipsTable() {
  try {
    console.log('Criando tabela de parcerias...');

    // Tabela de parcerias entre escolas e empresas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS partnerships (
        id SERIAL PRIMARY KEY,
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- status: pending (aguardando), accepted (aceita), rejected (rejeitada)
        requested_by VARCHAR(10) NOT NULL,
        -- requested_by: school ou company (quem solicitou primeiro)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, company_id)
      )
    `);

    console.log('✅ Tabela partnerships criada com sucesso!');

    // Criar índices para performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_partnerships_school ON partnerships(school_id);
      CREATE INDEX IF NOT EXISTS idx_partnerships_company ON partnerships(company_id);
      CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);
    `);

    console.log('✅ Índices criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  } finally {
    await pool.end();
  }
}

createPartnershipsTable();
