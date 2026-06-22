import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

(async () => {
  try {
    console.log('🔍 Conectando ao banco...');
    
    // Verificar usuários
    const usersResult = await pool.query('SELECT id, name, email, type FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\n👤 Usuários:');
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.type}`);
      console.log(`   ID: ${user.id}`);
    });
    
    // Verificar currículos
    const resumesResult = await pool.query('SELECT id, user_id, title, template, is_public, created_at FROM resumes ORDER BY created_at DESC');
    console.log('\n📋 Currículos:');
    console.log('Total:', resumesResult.rows.length);
    
    resumesResult.rows.forEach((resume, index) => {
      console.log(`${index + 1}. "${resume.title}" (${resume.template})`);
      console.log(`   ID: ${resume.id}`);
      console.log(`   User ID: ${resume.user_id}`);
      console.log(`   Público: ${resume.is_public}`);
      console.log(`   Criado em: ${resume.created_at}`);
      console.log('');
    });

    // Verificar o usuário logado específico
    const currentUserId = 'c4e4d372-6680-450c-a8cb-cbe14c550dbd';
    const userResumes = await pool.query('SELECT * FROM resumes WHERE user_id = $1', [currentUserId]);
    console.log(`\n🎯 Currículos do usuário logado (${currentUserId}):`);
    console.log('Total:', userResumes.rows.length);
    
    userResumes.rows.forEach((resume, index) => {
      console.log(`${index + 1}. "${resume.title}"`);
      console.log(`   ID: ${resume.id}`);
      console.log(`   Template: ${resume.template}`);
      console.log(`   Dados pessoais:`, typeof resume.personal_info, Object.keys(resume.personal_info || {}));
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
})();
