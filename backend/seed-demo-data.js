import pool from './config/database.js';
import bcrypt from 'bcryptjs';

const seedDemoData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando seed de dados demo...\n');

    await client.query('BEGIN');

    // ========== 1. CRIAR 3 EMPRESAS ==========
    console.log('🏢 Criando 3 empresas...');
    
    const companies = [
      {
        name: 'Tech Solutions',
        email: 'tech.solutions@demo.com',
        cnpj: '12.345.678/0001-01',
        phone: '(11) 3333-4444',
        location: 'São Paulo - SP',
        bio: 'Empresa líder em soluções de software e consultoria tecnológica'
      },
      {
        name: 'Creative Digital',
        email: 'creative.digital@demo.com',
        cnpj: '12.345.678/0001-02',
        phone: '(21) 3333-5555',
        location: 'Rio de Janeiro - RJ',
        bio: 'Agência digital especializada em design e marketing'
      },
      {
        name: 'Industrial Services',
        email: 'industrial.services@demo.com',
        cnpj: '12.345.678/0001-03',
        phone: '(31) 3333-6666',
        location: 'Belo Horizonte - MG',
        bio: 'Serviços industriais e consultoria em processos'
      }
    ];

    const companyIds = [];
    const hashedPassword = await bcrypt.hash('123456', 10);

    for (const company of companies) {
      const result = await client.query(`
        INSERT INTO users (email, password, name, company_name, cnpj, phone, location, bio, type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'company', NOW())
        RETURNING id, company_name, email
      `, [company.email, hashedPassword, company.name, company.name, company.cnpj, company.phone, company.location, company.bio]);
      
      const companyId = result.rows[0].id;
      companyIds.push(companyId);
      console.log(`  ✅ ${result.rows[0].company_name} (${result.rows[0].email})`);
    }

    // ========== 2. CRIAR 3 ESCOLAS COM 2 TURMAS CADA ==========
    console.log('\n🏫 Criando 3 escolas com 2 turmas cada...');
    
    const schools = [
      {
        name: 'Instituto de Tecnologia Avançada',
        email: 'ita@demo.com',
        location: 'São Paulo - SP',
        city: 'São Paulo',
        courses: ['Análise de Sistemas', 'Desenvolvimento Web']
      },
      {
        name: 'Escola Profissional do Conhecimento',
        email: 'epconhecimento@demo.com',
        location: 'Belo Horizonte - MG',
        city: 'Belo Horizonte',
        courses: ['Administração', 'Gestão de Negócios']
      },
      {
        name: 'Centro de Formação Empresarial',
        email: 'cfe@demo.com',
        location: 'Rio de Janeiro - RJ',
        city: 'Rio de Janeiro',
        courses: ['Marketing Digital', 'Empreendedorismo']
      }
    ];

    const schoolData = [];

    for (const school of schools) {
      const schoolResult = await client.query(`
        INSERT INTO users (email, password, name, school_name, school_city, location, type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'school', NOW())
        RETURNING id
      `, [school.email, hashedPassword, school.name, school.name, school.city, school.location]);

      const schoolId = schoolResult.rows[0].id;
      console.log(`  ✅ ${school.name}`);

      // Criar 2 cursos/turmas para cada escola
      const courseIds = [];
      for (const courseName of school.courses) {
        const courseResult = await client.query(`
          INSERT INTO courses (school_id, name, description, duration_months, level, area, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `, [schoolId, courseName, `Turma de ${courseName}`, 6, 'tecnico', 'Tecnologia', true]);

        const courseId = courseResult.rows[0].id;
        courseIds.push({ id: courseId, name: courseName });
        console.log(`     📚 Turma: ${courseName}`);
      }

      schoolData.push({ schoolId, courseIds });
    }

    // ========== 3. CRIAR 5 ALUNOS POR TURMA ==========
    console.log('\n👥 Criando 5 alunos por turma...');
    
    const firstNames = ['Ana', 'Carlos', 'Beatriz', 'Diego', 'Fernanda'];
    const lastNames = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira'];
    let studentCounter = 0;
    
    let totalStudents = 0;
    
    for (const school of schoolData) {
      for (const course of school.courseIds) {
        for (let i = 0; i < 5; i++) {
          const firstName = firstNames[i];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const name = `${firstName} ${lastName}`;
          const email = `aluno${studentCounter++}@demo.com`;
          const cpf = `${Math.floor(Math.random() * 100).toString().padStart(3, '0')}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
          const phone = `(11) 9${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          const registration = `EST${Date.now().toString().slice(-6)}${i}`;
          const birthDate = new Date(1998 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

          // Criar usuário
          const userResult = await client.query(`
            INSERT INTO users (email, password, name, cpf, phone, type, created_at)
            VALUES ($1, $2, $3, $4, $5, 'candidate', NOW())
            RETURNING id
          `, [email, hashedPassword, name, cpf, phone]);

          const userId = userResult.rows[0].id;

          // Criar registro de estudante
          await client.query(`
            INSERT INTO students (
              user_id, school_id, course_id, student_registration, 
              enrollment_date, current_semester, total_semesters,
              birth_date, gender, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
          `, [
            userId, school.schoolId, course.id, registration,
            '2024-02-01', 1, 4, birthDate.toISOString().split('T')[0], 
            Math.random() > 0.5 ? 'feminino' : 'masculino'
          ]);

          totalStudents++;
        }
        console.log(`     ✅ 5 alunos criados para turma: ${course.name}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('✨ SEED DE DADOS COMPLETO ✨');
    console.log('='.repeat(60));
    console.log(`📊 Resumo:`);
    console.log(`   ✅ 3 Empresas criadas`);
    console.log(`   ✅ 3 Escolas criadas`);
    console.log(`   ✅ 6 Turmas criadas (2 por escola)`);
    console.log(`   ✅ ${totalStudents} Alunos criados (5 por turma)`);
    console.log('\n🔐 Credenciais de acesso:');
    console.log('   📧 Email: qualquer email criado acima');
    console.log('   🔑 Senha: 123456');
    console.log('\n📧 Exemplos de emails criados:');
    companies.forEach(c => console.log(`   Empresa: ${c.email}`));
    schools.forEach(s => console.log(`   Escola: ${s.email}`));
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao fazer seed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
  }
};

seedDemoData();
