import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'curriculoja', 
  user: 'postgres', 
  password: 'admin' 
});

async function checkStudent() {
  try {
    // Buscar student e class_id do aluno
    const result = await pool.query(`
      SELECT s.id as student_id, s.class_id, s.user_id, u.email 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE u.email = 'joaquimsenai@gmail.com'
    `);
    
    console.log('\n=== Dados do aluno ===');
    console.table(result.rows);
    
    if (result.rows.length > 0) {
      const classId = result.rows[0].class_id;
      console.log('\nClass ID:', classId);
      
      // Verificar journey_responses com JOIN para pegar nome do aluno
      const journeyData = await pool.query(`
        SELECT 
          jr.*,
          u.email,
          s.class_id
        FROM journey_responses jr
        JOIN users u ON jr.user_id = u.id
        LEFT JOIN students s ON jr.student_id = s.id
        WHERE s.class_id = $1
      `, [classId]);
      
      console.log('\n=== Journey responses para a turma ===');
      console.log('Total:', journeyData.rowCount);
      if (journeyData.rowCount > 0) {
        journeyData.rows.forEach((row, i) => {
          console.log(`${i+1}. ${row.email} - Nervoso: ${row.nervoso}, Preparado: ${row.preparado_entrevista}, Level: ${row.interview_level}`);
        });
      }
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

checkStudent();
