import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Garantir que o .env certo (da pasta backend) seja carregado, mesmo se o CWD for a raiz
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Prioridade de configuração:
// 1. DATABASE_URL (Railway padrão e outros provedores)
// 2. Variáveis PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD (Railway individual)
// 3. Variáveis DB_* (configuração local legada)
const isProduction = process.env.NODE_ENV === 'production';

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  const host     = process.env.PGHOST     || process.env.DB_HOST     || 'localhost';
  const port     = process.env.PGPORT     || process.env.DB_PORT     || 5432;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.DB_NAME || 'curriculoja';
  const user     = process.env.PGUSER     || process.env.DB_USER     || 'postgres';
  const rawPw    = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  const password = typeof rawPw === 'string' && rawPw.length > 0 ? rawPw : undefined;

  return {
    host,
    port: Number(port),
    database,
    user,
    password,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool({
  ...getPoolConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Teste de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao banco PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err);
});

export default pool;
