import pool from './config/database.js';

async function debugResumeData() {
  try {
    console.log('🔍 Verificando dados do currículo...\n');
    
    // Buscar o currículo específico
    const result = await pool.query('SELECT * FROM resumes WHERE id = $1', ['a2d33530-8e66-4a0c-bf21-d990be0433a9']);
    
    if (result.rows.length > 0) {
      const resume = result.rows[0];
      console.log('✅ CURRÍCULO ENCONTRADO:');
      console.log('='.repeat(50));
      console.log('ID:', resume.id);
      console.log('Title:', resume.title);
      console.log('User ID:', resume.user_id);
      console.log('Template:', resume.template);
      console.log('Is Public:', resume.is_public);
      console.log('Created At:', resume.created_at);
      console.log('\n📋 DADOS DETALHADOS:');
      console.log('-'.repeat(30));
      
      // Personal Info
      console.log('\n👤 PERSONAL_INFO:');
      console.log('Type:', typeof resume.personal_info);
      if (resume.personal_info) {
        console.log('Content:', JSON.stringify(resume.personal_info, null, 2));
      } else {
        console.log('❌ NULL ou VAZIO');
      }
      
      // Education
      console.log('\n🎓 EDUCATION:');
      console.log('Type:', typeof resume.education);
      if (resume.education) {
        console.log('Content:', JSON.stringify(resume.education, null, 2));
      } else {
        console.log('❌ NULL ou VAZIO');
      }
      
      // Experience
      console.log('\n💼 EXPERIENCE:');
      console.log('Type:', typeof resume.experience);
      if (resume.experience) {
        console.log('Content:', JSON.stringify(resume.experience, null, 2));
      } else {
        console.log('❌ NULL ou VAZIO');
      }
      
      // Skills
      console.log('\n🛠️  SKILLS:');
      console.log('Type:', typeof resume.skills);
      if (resume.skills) {
        console.log('Content:', JSON.stringify(resume.skills, null, 2));
      } else {
        console.log('❌ NULL ou VAZIO');
      }
      
      // Languages
      console.log('\n🌐 LANGUAGES:');
      console.log('Type:', typeof resume.languages);
      if (resume.languages) {
        console.log('Content:', JSON.stringify(resume.languages, null, 2));
      } else {
        console.log('❌ NULL ou VAZIO');
      }
      
      // Courses
      console.log('\n📚 COURSES:');
      console.log('Type:', typeof resume.courses);
      if (resume.courses) {
        console.log('Content:', JSON.stringify(resume.courses, null, 2));
      } else {
        console.log('❌ NULL ou VAZIO');
      }
      
    } else {
      console.log('❌ Currículo não encontrado');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

debugResumeData();
