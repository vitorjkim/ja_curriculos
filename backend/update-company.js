import pool from './config/database.js';

async function updateCompany() {
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, company_name = $2 WHERE email = $3 RETURNING *',
      ['João Silva', 'Empresa Exemplo Ltda', 'empresa@exemplo.com']
    );
    console.log('✅ Empresa atualizada:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

updateCompany();
