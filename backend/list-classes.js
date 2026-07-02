import pool from './config/database.js';

(async () => {
  try {
    console.log('\n🔍 Procurando turma eb9593f3-49cf-40cf-955a-6412aaf8e395\n');
    
    // Check if class_id exists in students
    const classStudentsRes = await pool.query(`
      SELECT COUNT(*) as count FROM students WHERE class_id = $1
    `, ['eb9593f3-49cf-40cf-955a-6412aaf8e395']);
    
    console.log(`   Alunos nessa turma: ${classStudentsRes.rows[0].count}`);
    
    // Get available classes
    console.log('\n📚 Turmas disponíveis em school_classes:\n');
    const classesRes = await pool.query(`
      SELECT id, name, school_id, created_at
      FROM school_classes
      LIMIT 10
    `);
    
    classesRes.rows.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.name || 'Sem nome'} (${c.id.substring(0, 8)}...)`);
    });
    
    if (classesRes.rows.length === 0) {
      console.log('   Nenhuma turma encontrada!');
    }
    
    // Get students to populate
    console.log('\n👥 Primeiros 10 alunos do banco:\n');
    const studentsRes = await pool.query(`
      SELECT s.id, s.user_id, s.class_id, u.name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LIMIT 10
    `);
    
    studentsRes.rows.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.name} - class_id: ${s.class_id ? s.class_id.substring(0, 8) + '...' : 'NULL'}`);
    });
    
    // Get available users
    console.log('\n👤 Total de usuários: 50 (candidatos potenciais para vincular)\n');
    
    // Get one valid class to use
    if (classesRes.rows.length > 0) {
      const validClassId = classesRes.rows[0].id;
      console.log(`✅ Usar esta turma para população: ${classesRes.rows[0].name}`);
      console.log(`   ID: ${validClassId}\n`);
      
      // Check students in this valid class
      const validClassStudents = await pool.query(`
        SELECT COUNT(*) as count FROM students WHERE class_id = $1
      `, [validClassId]);
      
      console.log(`   Alunos atuais: ${validClassStudents.rows[0].count}`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
