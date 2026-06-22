import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({ 
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function checkCompanyLogos() {
  try {
    // Buscar a empresa SRS
    const srsResult = await pool.query(`
      SELECT id, name, email, type, profile_image 
      FROM users 
      WHERE name ILIKE '%SRS%' OR name ILIKE '%Já%'
    `);
    
    console.log('Empresas SRS/Já e suas imagens:');
    srsResult.rows.forEach(c => {
      console.log(`  - ${c.name} (${c.id}): profile_image=${c.profile_image ? 'TEM IMAGEM (' + c.profile_image.length + ' chars)' : 'NULL'}`);
    });
    
    // Verificar as applications do usuário joaquim
    const appResult = await pool.query(`
      SELECT 
        a.id as app_id,
        j.id as job_id,
        j.title as job_title,
        j.company_id,
        c.id as company_user_id,
        c.name as company_name,
        c.company_name as company_real_name,
        c.profile_image as company_logo
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN users c ON j.company_id = c.id
      WHERE a.candidate_id = '70d24be8-0dde-4145-bdc8-2c179137c99c'
      LIMIT 5
    `);
    
    console.log('\nCandidaturas do usuário com logos:');
    appResult.rows.forEach(a => {
      console.log(`  - Job: ${a.job_title}`);
      console.log(`    company_id: ${a.company_id}`);
      console.log(`    company_user_id: ${a.company_user_id}`);
      console.log(`    company_name (users.name): ${a.company_name}`);
      console.log(`    company_real_name (users.company_name): ${a.company_real_name}`);
      console.log(`    logo: ${a.company_logo ? 'TEM (' + a.company_logo.length + ' chars)' : 'NULL'}`);
    });
    
  } catch (e) {
    console.error('Erro:', e);
  } finally {
    await pool.end();
  }
}

checkCompanyLogos();
