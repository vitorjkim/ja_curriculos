import pool from './config/database.js';
import bcrypt from 'bcryptjs';

const createAdminUser = async () => {
  const client = await pool.connect();
  
  try {
    console.log('👤 Criando usuário administrador...');

    // Verificar se já existe admin
    const existingAdmin = await client.query(
      "SELECT id FROM users WHERE type = 'admin' OR email = 'admin@curriculoja.com'"
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('ℹ️  Usuário admin já existe.');
      return;
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Criar usuário admin
    await client.query(`
      INSERT INTO users (email, password, name, type, is_admin, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      'admin@curriculoja.com',
      passwordHash,
      'Administrador',
      'admin',
      true
    ]);

    console.log('✅ Usuário administrador criado!');
    console.log('📧 Email: admin@curriculoja.com');
    console.log('🔐 Senha: admin123');

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createAdminUser();
