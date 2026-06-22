import pool from './config/database.js';
import bcrypt from 'bcryptjs';

async function createTestCompany() {
  try {
    const result = await pool.query('SELECT id, email, name, company_name, type FROM users WHERE type = $1', ['company']);
    console.log('Empresas encontradas:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('Nenhuma empresa encontrada. Criando empresa teste...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const insertResult = await pool.query(`
        INSERT INTO users (email, password, name, company_name, type, created_at) 
        VALUES ($1, $2, $3, $4, $5, NOW()) 
        RETURNING id, email, name, company_name, type
      `, ['empresa@teste.com', hashedPassword, 'João Silva', 'Empresa Teste Ltda', 'company']);
      
      console.log('✅ Empresa criada:', insertResult.rows[0]);
      console.log('📧 Email: empresa@teste.com');
      console.log('🔐 Senha: 123456');
    } else {
      console.log('✅ Empresas já existem no banco:', result.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createTestCompany();
