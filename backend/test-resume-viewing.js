import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testResumeViewing() {
  console.log('🔍 Testando visualização de currículos...\n');
  
  try {
    // 1. Buscar uma candidatura existente
    const applicationQuery = `
      SELECT a.*, j.company_id, j.title as job_title, r.personal_info, r.user_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN resumes r ON a.resume_id = r.id
      LIMIT 1
    `;
    
    const applicationResult = await pool.query(applicationQuery);
    
    if (applicationResult.rows.length === 0) {
      console.log('❌ Nenhuma candidatura encontrada');
      return;
    }
    
    const application = applicationResult.rows[0];
    console.log('📋 Candidatura encontrada:');
    console.log(`   - Candidato: ${application.personal_info.name}`);
    console.log(`   - Vaga: ${application.job_title}`);
    console.log(`   - Data: ${application.created_at}`);
    console.log(`   - Resume ID: ${application.resume_id}`);
    console.log(`   - Company ID: ${application.company_id}\n`);
    
    // 2. Testar se a empresa consegue visualizar o currículo
    const resumeViewQuery = `
      SELECT r.* 
      FROM resumes r
      WHERE r.id = $1
      AND (
        r.user_id = $2  -- Proprietário
        OR EXISTS (     -- Ou empresa que recebeu candidatura
          SELECT 1 FROM applications a
          JOIN jobs j ON a.job_id = j.id
          WHERE a.resume_id = r.id 
          AND j.company_id = $2
        )
      )
    `;
    
    const resumeResult = await pool.query(resumeViewQuery, [
      application.resume_id,
      application.company_id
    ]);
    
    if (resumeResult.rows.length > 0) {
      const resume = resumeResult.rows[0];
      console.log('✅ Empresa pode visualizar o currículo:');
      console.log(`   - ID: ${resume.id}`);
      console.log(`   - Título: ${resume.title}`);
      console.log(`   - Personal Info:`, resume.personal_info);
      console.log(`   - Criado em: ${resume.created_at}`);
      console.log(`   - Padrão: ${resume.is_default}\n`);
      
      // 3. Verificar estrutura dos dados
      console.log('🔍 Estrutura dos dados do currículo:');
      console.log('   - personal_info type:', typeof resume.personal_info);
      console.log('   - education type:', typeof resume.education);
      console.log('   - experience type:', typeof resume.experience);
      console.log('   - courses type:', typeof resume.courses);
      console.log('   - languages type:', typeof resume.languages);
      
    } else {
      console.log('❌ Empresa NÃO pode visualizar o currículo');
    }
    
    // 4. Testar endpoint da API
    console.log('\n🌐 Testando endpoint da API...');
    const fetch = (await import('node-fetch')).default;
    
    try {
      const response = await fetch(`http://localhost:3001/api/resumes/${application.resume_id}`);
      const resumeData = await response.json();
      
      if (response.ok) {
        console.log('✅ API retornou currículo com sucesso');
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Nome: ${resumeData.personal_info?.name}`);
      } else {
        console.log('❌ API retornou erro:', resumeData);
      }
    } catch (apiError) {
      console.log('❌ Erro ao chamar API:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testResumeViewing();
