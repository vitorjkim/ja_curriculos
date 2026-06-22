import { Pool } from 'pg';

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

async function resetVitorPassword() {
  try {
    console.log('🔑 Redefinindo senha do usuário vitor...');
    console.log('✅ Conectado ao banco PostgreSQL');
    
    // Verificar se usuário existe
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      ['vitor@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado: vitor@gmail.com');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Usuário encontrado:', user.name, user.email);
    
    // Usar hash simples para teste (em produção usar bcrypt)
    const simpleHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // hash de "password"
    
    // Atualizar senha
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [simpleHash, 'vitor@gmail.com']
    );
    
    console.log('✅ Senha redefinida com sucesso!');
    console.log('📧 Email: vitor@gmail.com');
    console.log('🔑 Nova senha: password');
    console.log('🌐 Acesse: http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
  } finally {
    await pool.end();
  }
}

resetVitorPassword();
