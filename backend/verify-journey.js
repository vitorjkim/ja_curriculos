const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'curriculoja',
  user: 'postgres',
  password: 'admin'
});

async function verify() {
  const output = [];
  output.push('=== VERIFICANDO DADOS DA JORNADA ===\n');
  
  // 1. Verificar journey_responses
  const jr = await pool.query('SELECT id, user_id, student_id, stage_id, interview_level FROM journey_responses');
  output.push(`Journey responses: ${jr.rows.length}`);
  jr.rows.forEach(r => {
    output.push(`  - stage ${r.stage_id}: user=${r.user_id}, student_id=${r.student_id || 'NULL!'}, level=${r.interview_level}`);
  });
  
  // 2. Verificar se student_id é NULL
  const nullStudent = await pool.query('SELECT COUNT(*) as count FROM journey_responses WHERE student_id IS NULL');
  output.push(`\nRegistros com student_id NULL: ${nullStudent.rows[0].count}`);
  
  // 3. Se houver student_id, verificar se o JOIN com students funciona
  const withStudent = await pool.query(`
    SELECT jr.id, s.id as student_id, s.class_id 
    FROM journey_responses jr 
    JOIN students s ON jr.student_id = s.id
  `);
  output.push(`\nJourney com JOIN students: ${withStudent.rows.length}`);
  
  // 4. Verificar class_id específico
  const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';
  const classQuery = await pool.query(`
    SELECT jr.*, s.class_id 
    FROM journey_responses jr 
    JOIN students s ON jr.student_id = s.id 
    WHERE s.class_id = $1
  `, [classId]);
  output.push(`\nJourney para turma ${classId}: ${classQuery.rows.length}`);
  
  await pool.end();
  
  const result = output.join('\n');
  fs.writeFileSync('c:/temp/journey-check.txt', result);
  console.log('DONE - check c:/temp/journey-check.txt');
}

verify().catch(console.error);
