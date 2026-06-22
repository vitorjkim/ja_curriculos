const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

async function listAdmins() {
  console.log('🔍 Verificando usuários admin no banco...\n');
  
  try {
    const result = await pool.query(`
      SELECT id, email, type, is_admin, created_at
      FROM users 
      WHERE type = 'admin' OR is_admin = true
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Usuários admin encontrados: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. Admin:`)
        console.log(`   Email: ${user.email}`);
        console.log(`   Tipo: ${user.type}`);
        console.log(`   Is Admin: ${user.is_admin}`);
        console.log(`   Criado em: ${user.created_at}\n`);
      });
    } else {
      console.log('❌ Nenhum usuário admin encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listAdmins();
