import pool from './config/database.js';
import bcrypt from 'bcryptjs';

const createSampleStudents = async () => {
  const client = await pool.connect();
  
  try {
    console.log('👥 Criando estudantes de exemplo...\n');

    // Buscar a escola de exemplo
    const schoolResult = await client.query(`
      SELECT id FROM users WHERE email = 'escola@exemplo.com' AND type = 'school'
    `);

    if (schoolResult.rows.length === 0) {
      console.log('❌ Escola de exemplo não encontrada. Execute primeiro o script create-school-system.js');
      return;
    }

    const schoolId = schoolResult.rows[0].id;

    // Buscar cursos disponíveis
    const coursesResult = await client.query(`
      SELECT id, name FROM courses WHERE school_id = $1
    `, [schoolId]);

    if (coursesResult.rows.length === 0) {
      console.log('❌ Nenhum curso encontrado para a escola');
      return;
    }

    console.log(`📚 Cursos disponíveis: ${coursesResult.rows.length}`);
    coursesResult.rows.forEach(course => {
      console.log(`   - ${course.name}`);
    });

    // Dados dos estudantes de exemplo
    const sampleStudents = [
      {
        name: 'Ana Costa',
        email: 'ana.costa@escola.com',
        cpf: '111.222.333-44',
        phone: '(11) 91111-1111',
        course_id: coursesResult.rows[0].id,
        student_registration: 'EST2024001',
        birth_date: '2000-03-15',
        gender: 'feminino',
        emergency_contact_name: 'José Costa',
        emergency_contact_phone: '(11) 81111-1111'
      },
      {
        name: 'Carlos Santos',
        email: 'carlos.santos@escola.com',
        cpf: '222.333.444-55',
        phone: '(11) 92222-2222',
        course_id: coursesResult.rows[1] ? coursesResult.rows[1].id : coursesResult.rows[0].id,
        student_registration: 'EST2024002',
        birth_date: '1999-07-22',
        gender: 'masculino',
        emergency_contact_name: 'Maria Santos',
        emergency_contact_phone: '(11) 82222-2222'
      },
      {
        name: 'Beatriz Oliveira',
        email: 'beatriz.oliveira@escola.com',
        cpf: '333.444.555-66',
        phone: '(11) 93333-3333',
        course_id: coursesResult.rows[0].id,
        student_registration: 'EST2024003',
        birth_date: '2001-11-08',
        gender: 'feminino',
        emergency_contact_name: 'Paulo Oliveira',
        emergency_contact_phone: '(11) 83333-3333'
      },
      {
        name: 'Diego Silva',
        email: 'diego.silva@escola.com',
        cpf: '444.555.666-77',
        phone: '(11) 94444-4444',
        course_id: coursesResult.rows[2] ? coursesResult.rows[2].id : coursesResult.rows[0].id,
        student_registration: 'EST2024004',
        birth_date: '2000-09-12',
        gender: 'masculino',
        emergency_contact_name: 'Rosa Silva',
        emergency_contact_phone: '(11) 84444-4444'
      },
      {
        name: 'Fernanda Lima',
        email: 'fernanda.lima@escola.com',
        cpf: '555.666.777-88',
        phone: '(11) 95555-5555',
        course_id: coursesResult.rows[1] ? coursesResult.rows[1].id : coursesResult.rows[0].id,
        student_registration: 'EST2024005',
        birth_date: '1998-12-03',
        gender: 'feminino',
        emergency_contact_name: 'Roberto Lima',
        emergency_contact_phone: '(11) 85555-5555'
      }
    ];

    await client.query('BEGIN');

    let createdCount = 0;
    const password = '123456'; // Senha padrão para todos
    const hashedPassword = await bcrypt.hash(password, 10);

    for (const studentData of sampleStudents) {
      try {
        // Verificar se email já existe
        const emailExists = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [studentData.email]
        );

        if (emailExists.rows.length > 0) {
          console.log(`⚠️ Email ${studentData.email} já existe, pulando...`);
          continue;
        }

        // Criar usuário
        const userResult = await client.query(`
          INSERT INTO users (email, password, name, cpf, phone, type, created_at)
          VALUES ($1, $2, $3, $4, $5, 'candidate', NOW())
          RETURNING id
        `, [studentData.email, hashedPassword, studentData.name, studentData.cpf, studentData.phone]);

        const userId = userResult.rows[0].id;

        // Criar registro de estudante
        await client.query(`
          INSERT INTO students (
            user_id, school_id, course_id, student_registration, 
            enrollment_date, current_semester, total_semesters,
            emergency_contact_name, emergency_contact_phone, 
            birth_date, gender, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW())
        `, [
          userId, schoolId, studentData.course_id, studentData.student_registration,
          '2024-02-01', 1, 4, studentData.emergency_contact_name,
          studentData.emergency_contact_phone, studentData.birth_date, studentData.gender
        ]);

        console.log(`✅ Estudante criado: ${studentData.name} (${studentData.student_registration})`);
        createdCount++;

      } catch (error) {
        console.log(`❌ Erro ao criar ${studentData.name}:`, error.message);
      }
    }

    await client.query('COMMIT');

    console.log(`\n✅ Processo concluído! ${createdCount} estudantes criados.`);
    
    // Criar algumas avaliações de exemplo
    console.log('\n📝 Criando avaliações de exemplo...');
    
    const studentsResult = await client.query(`
      SELECT s.id, u.name 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.school_id = $1 
      LIMIT 3
    `, [schoolId]);

    const subjects = ['Matemática', 'Português', 'História', 'Ciências', 'Inglês'];
    const evaluationTypes = ['prova', 'trabalho', 'projeto'];
    
    for (const student of studentsResult.rows) {
      // Criar 2-3 avaliações por estudante
      const numEvaluations = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < numEvaluations; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const evaluationType = evaluationTypes[Math.floor(Math.random() * evaluationTypes.length)];
        const score = (Math.random() * 4 + 6).toFixed(1); // Notas entre 6.0 e 10.0
        
        await client.query(`
          INSERT INTO student_evaluations (
            student_id, evaluator_id, subject, evaluation_type, 
            score, max_score, evaluation_date, semester, year, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          student.id, schoolId, subject, evaluationType, 
          score, 10.0, '2024-03-15', 1, 2024
        ]);
      }
      
      console.log(`📝 Avaliações criadas para: ${student.name}`);
    }

    console.log('\n🎉 Dados de exemplo criados com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`- ${createdCount} estudantes criados`);
    console.log(`- ${studentsResult.rows.length * 2} avaliações criadas`);
    console.log('- Senha padrão para todos: 123456');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar estudantes:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

createSampleStudents();
