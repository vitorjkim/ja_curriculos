import pool from './config/database.js';

const classId = process.argv[2] || 'eb9593f3-49cf-40cf-955a-6412aaf8e395';

(async () => {
  try {
    console.log(`\n🔍 Verificando turma: ${classId}`);
    
    // Check if class exists
    const classRes = await pool.query('SELECT id, name FROM classes WHERE id = $1', [classId]);
    if (classRes.rows.length === 0) {
      console.log('❌ Turma não encontrada');
      await pool.end();
      return;
    }
    
    console.log(`✅ Turma encontrada: ${classRes.rows[0].name}\n`);
    
    // Check students in class
    const studentsRes = await pool.query(`
      SELECT s.id, s.user_id, u.name, u.email
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = $1
    `, [classId]);
    
    console.log(`📚 Alunos na turma: ${studentsRes.rows.length}`);
    if (studentsRes.rows.length > 0) {
      studentsRes.rows.forEach((s, i) => {
        console.log(`   ${i+1}. ${s.name} (${s.email}) - user_id: ${s.user_id}`);
      });
    } else {
      console.log('   Nenhum aluno adicionado ainda');
    }
    
    // Check available candidates
    const candidatesRes = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.type = 'candidate'
      LIMIT 5
    `);
    
    console.log(`\n👥 Candidatos disponíveis: ${candidatesRes.rows.length}`);
    candidatesRes.rows.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.name} (${c.email}) - id: ${c.id}`);
    });
    
    // Check school
    const schoolRes = await pool.query('SELECT id, name FROM schools LIMIT 1');
    if (schoolRes.rows.length > 0) {
      console.log(`\n🏫 Escola: ${schoolRes.rows[0].name} (${schoolRes.rows[0].id})`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
