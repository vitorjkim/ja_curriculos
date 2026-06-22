import pool from './config/database.js';

async function checkApplicationsAndResumes() {
  try {
    console.log('📋 Verificando candidaturas e currículos...\n');
    
    const applications = await pool.query(`
      SELECT 
        a.id,
        a.resume_id,
        a.candidate_id,
        a.created_at,
        u.name as candidate_name,
        u.email as candidate_email,
        r.title as resume_title
      FROM applications a
      JOIN users u ON a.candidate_id = u.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);
    
    console.log('🔍 Candidaturas encontradas:');
    applications.rows.forEach((app, index) => {
      console.log(`\n${index + 1}. Candidatura ID: ${app.id}`);
      console.log(`   Candidato: ${app.candidate_name} (${app.candidate_email})`);
      console.log(`   Resume ID: ${app.resume_id}`);
      console.log(`   Resume Title: ${app.resume_title}`);
      console.log(`   Data: ${app.created_at}`);
    });
    
    // Verificar se os currículos realmente existem
    console.log('\n🔍 Verificando se os currículos existem:');
    for (const app of applications.rows) {
      if (app.resume_id) {
        const resume = await pool.query('SELECT id, title, user_id FROM resumes WHERE id = $1', [app.resume_id]);
        if (resume.rows.length > 0) {
          console.log(`✅ Currículo ${app.resume_id} existe: "${resume.rows[0].title}"`);
        } else {
          console.log(`❌ Currículo ${app.resume_id} NÃO encontrado!`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkApplicationsAndResumes();
