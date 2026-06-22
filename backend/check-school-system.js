import pool from './config/database.js';

async function checkSchoolSystemStatus() {
  try {
    console.log('🔍 Verificando status do sistema de escolas...\n');

    // 1. Verificar se as tabelas existem
    console.log('📋 Verificando tabelas...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('courses', 'students', 'student_evaluations')
      ORDER BY table_name
    `);

    const expectedTables = ['courses', 'students', 'student_evaluations'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    expectedTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ Tabela ${table} existe`);
      } else {
        console.log(`   ❌ Tabela ${table} não encontrada`);
      }
    });

    // 2. Verificar campos adicionais na tabela users
    console.log('\n🏫 Verificando campos de escola na tabela users...');
    const userColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE 'school_%'
      ORDER BY column_name
    `);

    const schoolFields = userColumnsResult.rows.map(row => row.column_name);
    console.log(`   ✅ ${schoolFields.length} campos de escola encontrados:`);
    schoolFields.forEach(field => {
      console.log(`      - ${field}`);
    });

    // 3. Verificar escola de exemplo
    console.log('\n🏢 Verificando escola de exemplo...');
    const schoolResult = await pool.query(`
      SELECT id, email, school_name, type 
      FROM users 
      WHERE email = 'escola@exemplo.com' AND type = 'school'
    `);

    if (schoolResult.rows.length > 0) {
      const school = schoolResult.rows[0];
      console.log(`   ✅ Escola encontrada: ${school.school_name}`);
      console.log(`   📧 Email: ${school.email}`);

      // 4. Contar cursos
      const coursesCount = await pool.query(`
        SELECT COUNT(*) as total FROM courses WHERE school_id = $1
      `, [school.id]);
      console.log(`   📚 Cursos: ${coursesCount.rows[0].total}`);

      // 5. Contar estudantes
      const studentsCount = await pool.query(`
        SELECT COUNT(*) as total FROM students WHERE school_id = $1
      `, [school.id]);
      console.log(`   👥 Estudantes: ${studentsCount.rows[0].total}`);

      // 6. Contar avaliações
      const evaluationsCount = await pool.query(`
        SELECT COUNT(*) as total 
        FROM student_evaluations se
        JOIN students s ON se.student_id = s.id
        WHERE s.school_id = $1
      `, [school.id]);
      console.log(`   📝 Avaliações: ${evaluationsCount.rows[0].total}`);

    } else {
      console.log('   ❌ Escola de exemplo não encontrada');
    }

    // 7. Verificar alguns estudantes
    console.log('\n👤 Verificando estudantes de exemplo...');
    const studentsResult = await pool.query(`
      SELECT u.name, u.email, s.student_registration, c.name as course_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      LIMIT 3
    `);

    if (studentsResult.rows.length > 0) {
      console.log(`   ✅ ${studentsResult.rows.length} estudantes encontrados:`);
      studentsResult.rows.forEach(student => {
        console.log(`      - ${student.name} (${student.student_registration}) - ${student.course_name || 'Sem curso'}`);
      });
    } else {
      console.log('   ❌ Nenhum estudante encontrado');
    }

    console.log('\n🎉 Verificação concluída!');
    console.log('\n📚 Para testar o sistema:');
    console.log('1. Inicie o servidor: node server.js');
    console.log('2. Faça login como escola: escola@exemplo.com / escola123');
    console.log('3. Use as rotas da API documentadas no SCHOOL_SYSTEM_README.md');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchoolSystemStatus();
