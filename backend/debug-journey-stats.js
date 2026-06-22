import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'curriculoja',
  user: 'postgres',
  password: 'admin'
});

const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';

async function debug() {
  try {
    // 1. Verificar dados na journey_responses
    console.log('\n=== 1. Dados na tabela journey_responses ===');
    const journeyData = await pool.query('SELECT * FROM journey_responses');
    console.log('Total registros:', journeyData.rowCount);
    console.log(JSON.stringify(journeyData.rows, null, 2));

    // 2. Verificar o estudante
    console.log('\n=== 2. Verificar estudante ===');
    const student = await pool.query(
      'SELECT s.id, s.class_id, s.user_id, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
      ['15f4f0ca-af89-4f60-9db3-7cd4298e5e5f']
    );
    console.log('Estudante:', JSON.stringify(student.rows, null, 2));

    // 3. Simular a query da API
    console.log('\n=== 3. Simular query da API (class stats) ===');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_students_with_responses,
        AVG(nervoso::numeric) as avg_nervoso,
        AVG(preparado_entrevista::numeric) as avg_preparado_entrevista,
        AVG(preparado_vaga::numeric) as avg_preparado_vaga,
        AVG(interview_score::numeric) as avg_interview_score,
        AVG(interview_max_score::numeric) as avg_interview_max_score
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1
    `, [classId]);
    console.log('Stats result:', JSON.stringify(stats.rows, null, 2));

    // 4. Verificar se a class_id do estudante bate com a que estamos consultando
    console.log('\n=== 4. Verificar class_id do estudante vs consultada ===');
    console.log('Class ID consultada:', classId);
    const studentClass = await pool.query('SELECT class_id FROM students WHERE id = $1', ['15f4f0ca-af89-4f60-9db3-7cd4298e5e5f']);
    console.log('Class ID do estudante:', studentClass.rows[0]?.class_id);
    console.log('São iguais?:', classId === studentClass.rows[0]?.class_id);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

debug();
