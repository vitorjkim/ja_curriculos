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

async function fixSchoolName() {
  try {
    // Verificar escola do joaquim (ID: ef37d761-91af-4730-baee-6b31ca3da416)
    const schoolId = 'ef37d761-91af-4730-baee-6b31ca3da416';
    
    // Ver dados atuais
    const before = await pool.query(`SELECT id, email, name, type FROM users WHERE id = $1`, [schoolId]);
    console.log('Antes:', before.rows[0]);
    
    // Atualizar nome da escola baseado no email ou colocar um nome padrão
    const result = await pool.query(`
      UPDATE users 
      SET name = 'SENAI'
      WHERE id = $1
      RETURNING id, email, name, type
    `, [schoolId]);
    
    console.log('Depois:', result.rows[0]);
    console.log('\nNome da escola atualizado com sucesso!');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

fixSchoolName();
