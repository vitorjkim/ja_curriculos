import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'curriculoja', 
  user: 'postgres', 
  password: 'admin' 
});

async function main() {
  try {
    // Verificar journey_responses
    const jr = await pool.query('SELECT * FROM journey_responses');
    console.log('=== JOURNEY RESPONSES ===');
    console.log('Total:', jr.rows.length);
    jr.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    // Verificar students da turma
    const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';
    const students = await pool.query(`
      SELECT s.id as student_id, s.user_id, s.class_id, u.email 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.class_id = $1
    `, [classId]);
    
    console.log('\n=== STUDENTS NA TURMA ===');
    console.log('Total:', students.rows.length);
    students.rows.forEach(s => console.log(JSON.stringify(s)));

    // Verificar se algum journey response tem student_id que bate
    console.log('\n=== JOURNEY + STUDENT MATCH ===');
    const match = await pool.query(`
      SELECT jr.*, s.class_id, u.email
      FROM journey_responses jr
      LEFT JOIN students s ON jr.student_id = s.id
      LEFT JOIN users u ON jr.user_id = u.id
    `);
    console.log('Total com match:', match.rows.length);
    match.rows.forEach(m => console.log(JSON.stringify(m, null, 2)));

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

main();
