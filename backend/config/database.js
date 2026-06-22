import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Garantir que o .env certo (da pasta backend) seja carregado, mesmo se o CWD for a raiz
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  // Somente defina a senha se for uma string válida
  password: typeof process.env.DB_PASSWORD === 'string' && process.env.DB_PASSWORD.length > 0
    ? process.env.DB_PASSWORD
    : undefined,
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo limite de inatividade
  connectionTimeoutMillis: 2000, // Tempo limite de conexão
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Teste de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao banco PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err);
});

export default pool;
