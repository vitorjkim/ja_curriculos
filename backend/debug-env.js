import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Verificando variáveis de ambiente:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);

// Tentar sem variáveis de ambiente
console.log('\n🔧 Testando conexão com valores fixos...');

import pkg from 'pg';
const { Pool } = pkg;

const testPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'curriculoja',
  user: 'postgres',
  password: 'admin'
});

try {
  const client = await testPool.connect();
  console.log('✅ Conexão com valores fixos: SUCESSO');
  client.release();
  await testPool.end();
} catch (error) {
  console.log('❌ Conexão com valores fixos: FALHA');
  console.log('Erro:', error.message);
}
