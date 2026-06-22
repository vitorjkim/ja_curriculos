const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

async function resetAdminPassword() {
  console.log('🔐 Resetando senha do admin...\n');
  
  try {
    const email = 'admin@curriculoja.com';
    const newPassword = 'admin123';
    
    // Criptografar nova senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Atualizar no banco
    const result = await pool.query(`
      UPDATE users 
      SET password = $1, updated_at = NOW()
      WHERE email = $2
      RETURNING email
    `, [hashedPassword, email]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Senha do admin ${email} resetada com sucesso!`);
      console.log(`📝 Nova senha: ${newPassword}`);
    } else {
      console.log('❌ Admin não encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
