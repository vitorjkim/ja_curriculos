import pool from './config/database.js';

(async () => {
  try {
    const result = await pool.query('SELECT id, email, company_name, type FROM users WHERE type = $1 LIMIT 5', ['company']);
    console.log('Empresas cadastradas:', result.rows);
    
    // Se não houver empresas, vamos mostrar todos os usuários
    if (result.rows.length === 0) {
      const allUsers = await pool.query('SELECT id, email, company_name, type FROM users LIMIT 5');
      console.log('Todos os usuários:', allUsers.rows);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
})();
