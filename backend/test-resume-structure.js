import pool from './config/database.js';

async function checkResumeStructure() {
  try {
    console.log('📋 Verificando estrutura do currículo...\n');
    
    const result = await pool.query('SELECT * FROM resumes WHERE id = $1', ['a2d33530-8e66-4a0c-bf21-d990be0433a9']);
    
    if (result.rows.length > 0) {
      const resume = result.rows[0];
      console.log('✅ Currículo encontrado:');
      console.log('- ID:', resume.id);
      console.log('- Title:', resume.title);
      console.log('- User ID:', resume.user_id);
      console.log('- Template:', resume.template);
      console.log('- Is Public:', resume.is_public);
      console.log('- Is Default:', resume.is_default);
      console.log('- Personal Info:', typeof resume.personal_info, resume.personal_info ? 'exists' : 'null');
      if (resume.personal_info) {
        console.log('  Personal Info Content:', resume.personal_info);
      }
      console.log('- Education:', typeof resume.education, resume.education ? 'exists' : 'null');
      console.log('- Experience:', typeof resume.experience, resume.experience ? 'exists' : 'null');
      console.log('- Skills:', typeof resume.skills, resume.skills ? 'exists' : 'null');
      console.log('- Created:', resume.created_at);
    } else {
      console.log('❌ Currículo não encontrado');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkResumeStructure();
