import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'curriculoja',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function checkStudentSchool() {
  try {
    // Verificar joaquim
    const joaquim = await pool.query(`
      SELECT id, email, name FROM users WHERE email LIKE '%joaquim%'
    `);
    console.log('Usuarios joaquim:', joaquim.rows);
    
    // Verificar se está em students
    const joaquimStudent = await pool.query(`
      SELECT * FROM students WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%joaquim%')
    `);
    console.log('Students joaquim:', joaquimStudent.rows);

    // Verificar escolas
    const schools = await pool.query(`
      SELECT id, name, profile_image 
      FROM users 
      WHERE type = 'school'
    `);
    
    console.log('\nEscolas cadastradas:');
    schools.rows.forEach(row => {
      console.log(`- ${row.name} (ID: ${row.id})`);
      console.log(`  Profile Image: ${row.profile_image || 'NÃO TEM'}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkStudentSchool();
