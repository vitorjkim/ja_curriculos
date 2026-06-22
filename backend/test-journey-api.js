import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'curriculoja', 
  user: 'postgres', 
  password: 'admin' 
});

const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';

async function testStats() {
  try {
    // Simular a mesma query da API
    const responses = await pool.query(`
      SELECT 
        jr.*,
        u.name as student_name,
        s.id as student_id
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      JOIN users u ON jr.user_id = u.id
      WHERE s.class_id = $1
      ORDER BY jr.completed_at DESC
    `, [classId]);

    console.log('\n=== Responses ===');
    console.log('Total:', responses.rowCount);
    responses.rows.forEach((r, i) => {
      console.log(`${i+1}. ${r.student_name || 'N/A'} - Nervoso: ${r.nervoso}, Preparado: ${r.preparado_entrevista}, Level: ${r.interview_level}`);
    });

    // Stats
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT jr.user_id) as total_students_with_responses,
        AVG(jr.nervoso) as avg_nervoso,
        AVG(jr.preparado_entrevista) as avg_preparado_entrevista,
        AVG(jr.preparado_vaga) as avg_preparado_vaga,
        AVG(jr.interview_score) as avg_interview_score,
        COUNT(CASE WHEN jr.interview_level = 'Excelente' THEN 1 END) as level_excelente,
        COUNT(CASE WHEN jr.interview_level = 'Bom' THEN 1 END) as level_bom,
        COUNT(CASE WHEN jr.interview_level = 'Regular' THEN 1 END) as level_regular,
        COUNT(CASE WHEN jr.interview_level = 'Precisa Melhorar' THEN 1 END) as level_precisa_melhorar
      FROM journey_responses jr
      JOIN students s ON jr.student_id = s.id
      WHERE s.class_id = $1 AND jr.stage_id = 0
    `, [classId]);

    console.log('\n=== Stats ===');
    console.log(stats.rows[0]);

    // Resultado final como a API retornaria
    const result = {
      responses: responses.rows,
      stats: stats.rows[0],
      total: parseInt(stats.rows[0].total_students_with_responses)
    };

    console.log('\n=== API Response (simulado) ===');
    console.log('Total alunos:', result.total);
    console.log('Média nervosismo:', parseFloat(result.stats.avg_nervoso).toFixed(1));
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

testStats();
