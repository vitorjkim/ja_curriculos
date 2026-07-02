import pool from './config/database.js';

const classId = process.argv[2] || '08f19152-9e95-493e-ac4a-2541516c6c62';

(async () => {
  const client = await pool.connect();
  try {
    console.log('\n🚀 Populando dados para turma: ' + classId + '\n');

    // 1. Get students in class
    console.log('📚 Buscando alunos da turma...');
    const studentsQuery = await client.query(`
      SELECT s.id as student_id, s.user_id, u.name, u.email, s.school_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = $1
      LIMIT 10
    `, [classId]);

    const students = studentsQuery.rows;
    console.log(`✅ Turma com ${students.length} alunos\n`);
    console.log(`📝 Alunos encontrados:`);
    students.forEach((s, i) => console.log(`   ${i+1}. ${s.name} (${s.email})`));
    console.log();

    if (students.length === 0) {
      console.log('❌ Nenhum aluno encontrado na turma');
      await client.release();
      return;
    }

    // 2. Create companies
    console.log('🏢 Criando empresas de teste...');
    const companies = [];
    const companyNames = ['Tech Innovations', 'Legal Services Pro', 'Business Consulting'];
    
    for (const name of companyNames) {
      const existingRes = await client.query(
        'SELECT id FROM users WHERE name = $1 AND type = $2',
        [name, 'company']
      );
      
      let companyId;
      if (existingRes.rows.length > 0) {
        companyId = existingRes.rows[0].id;
        console.log(`   📌 ${name} (já existe)`);
      } else {
        const res = await client.query(`
          INSERT INTO users (name, email, password, type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id
        `, [name, `${name.toLowerCase().replace(' ', '')}_test@company.com`, 'hashed_pwd', 'company']);
        companyId = res.rows[0].id;
        console.log(`   ✅ ${name} criada`);
      }
      companies.push(companyId);
    }
    console.log();

    // 3. Create jobs
    console.log('💼 Criando vagas de teste...');
    const jobs = [];
    const jobTitles = ['Dev Jr', 'Analista Juridico', 'Consultor', 'Designer UX', 'Marketing'];
    
    for (let i = 0; i < jobTitles.length; i++) {
      const companyId = companies[i % companies.length];
      const title = jobTitles[i];
      
      const existingRes = await client.query(
        'SELECT id FROM jobs WHERE title = $1',
        [title]
      );
      
      let jobId;
      if (existingRes.rows.length > 0) {
        jobId = existingRes.rows[0].id;
        console.log(`   📌 ${title} (já existe)`);
      } else {
        const res = await client.query(`
          INSERT INTO jobs (company_id, title, description, requirements, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id
        `, [companyId, title, `Descrição da vaga: ${title}`, 'Requisitos da vaga', ]);
        jobId = res.rows[0].id;
        console.log(`   ✅ ${title} criada`);
      }
      jobs.push(jobId);
    }
    console.log();

    // 5. Simular estados dos alunos
    console.log('👥 Simulando estados dos alunos...');

    // Estado 1: Sem currículo (nenhuma ação)
    console.log(`   📌 ${students[0].name}: Sem currículo`);

    // Estado 2: Com currículo (criar resume)
    if (students[1]) {
      console.log(`   📌 ${students[1].name}: Com currículo`);
      await client.query(`
        INSERT INTO resumes (user_id, title, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [students[1].user_id, 'Meu Currículo']);
    }

    // Estado 3: Candidatura (aplicou em vaga)
    if (students[2]) {
      console.log(`   📌 ${students[2].name}: Com candidatura`);
      const resume = await client.query(
        'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
        [students[2].user_id]
      );
      if (resume.rows.length === 0) {
        await client.query(`
          INSERT INTO resumes (user_id, title, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
        `, [students[2].user_id, 'Meu Currículo']);
      }
      
      await client.query(`
        INSERT INTO applications (candidate_id, job_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [students[2].user_id, jobs[0], 'interested']);
    }

    // Estado 4: Pré-aprovado (aplicação aprovada)
    if (students[3]) {
      console.log(`   📌 ${students[3].name}: Pré-aprovado`);
      const resume = await client.query(
        'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
        [students[3].user_id]
      );
      if (resume.rows.length === 0) {
        await client.query(`
          INSERT INTO resumes (user_id, title, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
        `, [students[3].user_id, 'Meu Currículo']);
      }

      await client.query(`
        INSERT INTO applications (candidate_id, job_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [students[3].user_id, jobs[1], 'approved']);
    }

    // Estado 5: Em entrevista
    if (students[4]) {
      console.log(`   📌 ${students[4].name}: Em entrevista`);
      const resume = await client.query(
        'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
        [students[4].user_id]
      );
      if (resume.rows.length === 0) {
        await client.query(`
          INSERT INTO resumes (user_id, title, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
        `, [students[4].user_id, 'Meu Currículo']);
      }

      const app = await client.query(`
        INSERT INTO applications (candidate_id, job_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [students[4].user_id, jobs[2], 'interview']);

      if (app.rows.length > 0) {
        await client.query(`
          UPDATE applications 
          SET interview_date = $1, interview_mode = $2
          WHERE id = $3
        `, [new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'video', app.rows[0].id]);
      }
    }

    // Estado 6: Contratado
    if (students[5]) {
      console.log(`   📌 ${students[5].name}: Contratado`);
      const resume = await client.query(
        'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
        [students[5].user_id]
      );
      if (resume.rows.length === 0) {
        await client.query(`
          INSERT INTO resumes (user_id, title, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
        `, [students[5].user_id, 'Meu Currículo']);
      }

      await client.query(`
        INSERT INTO applications (candidate_id, job_id, status, final_approved, final_approved_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [students[5].user_id, jobs[3], 'approved', true]);
    }

    // Estados adicionais para outros alunos
    for (let i = 6; i < students.length; i++) {
      const state = i % 3;
      if (state === 0) {
        console.log(`   📌 ${students[i].name}: Com currículo`);
        await client.query(`
          INSERT INTO resumes (user_id, title, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [students[i].user_id, 'Meu Currículo']);
      } else if (state === 1) {
        console.log(`   📌 ${students[i].name}: Com candidatura`);
        const resume = await client.query(
          'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
          [students[i].user_id]
        );
        if (resume.rows.length === 0) {
          await client.query(`
            INSERT INTO resumes (user_id, title, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
          `, [students[i].user_id, 'Meu Currículo']);
        }
        
        await client.query(`
          INSERT INTO applications (candidate_id, job_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [students[i].user_id, jobs[i % jobs.length], 'interested']);
      } else {
        console.log(`   📌 ${students[i].name}: Pré-aprovado`);
        const resume = await client.query(
          'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
          [students[i].user_id]
        );
        if (resume.rows.length === 0) {
          await client.query(`
            INSERT INTO resumes (user_id, title, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
          `, [students[i].user_id, 'Meu Currículo']);
        }

        await client.query(`
          INSERT INTO applications (candidate_id, job_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [students[i].user_id, jobs[i % jobs.length], 'approved']);
      }
    }

    console.log('\n✅ Dados populados com sucesso!');
    console.log(`\n📊 Resumo:`);
    console.log(`   Alunos: ${students.length}`);
    console.log(`   Empresas: ${companies.length}`);
    console.log(`   Vagas: ${jobs.length}`);
    console.log(`   Estados: Sem currículo, Currículo, Candidatura, Pré-aprovado, Entrevista, Contratado\n`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
