import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'curriculoja', 
  user: 'postgres', 
  password: 'admin' 
});

async function insertTestData() {
  try {
    // Dados do aluno joaquimsenai@gmail.com
    const userId = '70d24be8-0dde-4145-bdc8-2c179137c99c';
    
    // Buscar student_id
    const studentRes = await pool.query(
      'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    const studentId = studentRes.rows.length > 0 ? studentRes.rows[0].id : null;
    console.log('Student ID encontrado:', studentId);
    
    // Verificar se já existe
    const existing = await pool.query(
      'SELECT id FROM journey_responses WHERE user_id = $1 AND stage_id = 0',
      [userId]
    );
    
    if (existing.rows.length > 0) {
      console.log('Registro já existe, atualizando...');
      await pool.query(`
        UPDATE journey_responses SET
          nervoso = 6,
          preparado_entrevista = 7,
          preparado_vaga = 5,
          quando_trabalhar_value = 2,
          quando_trabalhar_text = 'Nos próximos 3 meses',
          interview_score = 7,
          interview_max_score = 9,
          interview_level = 'Bom',
          interview_answers = $1,
          school_type_category = 'tecnico',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND stage_id = 0
      `, [
        JSON.stringify([
          { questionId: 1, answer: 'Demonstrar interesse e fazer perguntas', correct: true },
          { questionId: 2, answer: 'Vestir-se adequadamente', correct: true },
          { questionId: 3, answer: 'Chegar no horário', correct: true }
        ]),
        userId
      ]);
      console.log('✅ Registro atualizado!');
    } else {
      console.log('Inserindo novo registro...');
      await pool.query(`
        INSERT INTO journey_responses (
          user_id, student_id, stage_id,
          nervoso, preparado_entrevista, preparado_vaga,
          quando_trabalhar_value, quando_trabalhar_text,
          interview_score, interview_max_score, interview_level, interview_answers,
          school_type_category
        ) VALUES ($1, $2, 0, 6, 7, 5, 2, 'Nos próximos 3 meses', 7, 9, 'Bom', $3, 'tecnico')
      `, [
        userId,
        studentId,
        JSON.stringify([
          { questionId: 1, answer: 'Demonstrar interesse e fazer perguntas', correct: true },
          { questionId: 2, answer: 'Vestir-se adequadamente', correct: true },
          { questionId: 3, answer: 'Chegar no horário', correct: true }
        ])
      ]);
      console.log('✅ Registro inserido!');
    }
    
    // Verificar dados
    const data = await pool.query('SELECT * FROM journey_responses WHERE user_id = $1', [userId]);
    console.log('\n=== Dados inseridos ===');
    console.table(data.rows);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

insertTestData();
