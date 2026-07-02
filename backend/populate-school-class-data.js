import pool from './config/database.js';
import bcrypt from 'bcryptjs';

/**
 * Script para popular dados de teste de uma turma escolar
 * Cria empresas, vagas, resumes e simula diferentes estados de candidatos
 * Estados: Sem currículo, Reprovados, Contratados, Entrevista, Pré-aprovados, Candidatura, Currículo
 */

const classId = process.argv[2] || 'eb9593f3-49cf-40cf-955a-6412aaf8e395';

const populateClassData = async () => {
  const client = await pool.connect();
  
  try {
    console.log(`\n🚀 Populando dados para turma: ${classId}\n`);

    // 1. Buscar alunos da turma
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
      return;
    }

    // 3. Criar 3 empresas de teste
    console.log('🏢 Criando empresas de teste...');
    const companies = [];
    const companyData = [
      { name: 'Tech Innovations Brasil', cnpj: '12.345.678/0001-90', email: 'tech.innovations@test.com' },
      { name: 'Digital Solutions Ltda', cnpj: '23.456.789/0001-01', email: 'digital.solutions@test.com' },
      { name: 'Cloud Services Consultoria', cnpj: '34.567.890/0001-12', email: 'cloud.services@test.com' }
    ];

    for (const comp of companyData) {
      const existingCompany = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [comp.email]
      );

      let companyId;
      if (existingCompany.rows.length > 0) {
        companyId = existingCompany.rows[0].id;
        console.log(`   ✅ ${comp.name} (já existe)`);
      } else {
        const newCompany = await client.query(`
          INSERT INTO users (email, password, company_name, cnpj, type, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [comp.email, await bcrypt.hash('password123', 10), comp.name, comp.cnpj, 'company']);
        companyId = newCompany.rows[0].id;
        console.log(`   ✅ ${comp.name} (criada)`);
      }
      companies.push({ id: companyId, name: comp.name });
    }
    console.log();

    // 4. Criar vagas de teste
    console.log('💼 Criando vagas de teste...');
    const jobs = [];
    const jobData = [
      { title: 'Desenvolvedor React Júnior', company: 0, salary: 4000 },
      { title: 'Designer UX/UI', company: 1, salary: 6000 },
      { title: 'Analista de Dados', company: 2, salary: 5500 },
      { title: 'QA Engineer', company: 0, salary: 4500 },
      { title: 'Desenvolvedor Full Stack', company: 1, salary: 7000 }
    ];

    for (const jobData_ of jobData) {
      const job = await client.query(`
        INSERT INTO jobs (
          company_id, title, description, salary_min, salary_max, 
          location, work_type, contract_type, experience_level, is_active, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id
      `, [
        companies[jobData_.company].id,
        jobData_.title,
        `Oportunidade em ${jobData_.title}`,
        jobData_.salary,
        jobData_.salary + 1000,
        'São Paulo, SP',
        'hibrido',
        'clt',
        'junior',
        true
      ]);
      jobs.push(job.rows[0].id);
      console.log(`   ✅ ${jobData_.title}`);
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
        INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT DO NOTHING
      `, [students[1].user_id, 'Meu Currículo', 'Profissional em desenvolvimento', true]);
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
          INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [students[2].user_id, 'Meu Currículo', 'Profissional em desenvolvimento', true]);
      }
      
      await client.query(`
        INSERT INTO applications (user_id, job_id, status, applied_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT DO NOTHING
      `, [students[2].user_id, jobs[0], 'applied']);
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
          INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [students[3].user_id, 'Meu Currículo', 'Profissional em desenvolvimento', true]);
      }

      await client.query(`
        INSERT INTO applications (user_id, job_id, status, applied_at)
        VALUES ($1, $2, $3, NOW())
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
          INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [students[4].user_id, 'Meu Currículo', 'Profissional em desenvolvimento', true]);
      }

      const app = await client.query(`
        INSERT INTO applications (user_id, job_id, status, applied_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [students[4].user_id, jobs[2], 'approved']);

      if (app.rows.length > 0) {
        await client.query(`
          INSERT INTO interviews (application_id, interview_date, interview_mode, scheduled_by_school)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [app.rows[0].id, new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'video', true]);
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
          INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [students[5].user_id, 'Meu Currículo', 'Profissional em desenvolvimento', true]);
      }

      const app = await client.query(`
        INSERT INTO applications (user_id, job_id, status, final_approved, final_approved_at, applied_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [students[5].user_id, jobs[3], 'approved', true]);
    }

    // Estados adicionais para outros alunos
    for (let i = 6; i < students.length; i++) {
      const state = i % 3;
      if (state === 0) {
        console.log(`   📌 ${students[i].name}: Com currículo`);
        await client.query(`
          INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT DO NOTHING
        `, [students[i].user_id, 'Meu Currículo', 'Profissional', true]);
      } else if (state === 1) {
        console.log(`   📌 ${students[i].name}: Com candidatura`);
        const resume = await client.query(
          'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
          [students[i].user_id]
        );
        if (resume.rows.length === 0) {
          await client.query(`
            INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `, [students[i].user_id, 'Meu Currículo', 'Profissional', true]);
        }
        
        await client.query(`
          INSERT INTO applications (user_id, job_id, status, applied_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT DO NOTHING
        `, [students[i].user_id, jobs[i % jobs.length], 'applied']);
      } else {
        console.log(`   📌 ${students[i].name}: Pré-aprovado`);
        const resume = await client.query(
          'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
          [students[i].user_id]
        );
        if (resume.rows.length === 0) {
          await client.query(`
            INSERT INTO resumes (user_id, title, professional_summary, is_active, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `, [students[i].user_id, 'Meu Currículo', 'Profissional', true]);
        }

        await client.query(`
          INSERT INTO applications (user_id, job_id, status, applied_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT DO NOTHING
        `, [students[i].user_id, jobs[i % jobs.length], 'approved']);
      }
    }
    console.log();

    console.log('✅ Dados populados com sucesso!\n');
    console.log('📊 Resumo:');
    console.log(`   - Empresas criadas: ${companies.length}`);
    console.log(`   - Vagas criadas: ${jobs.length}`);
    console.log(`   - Alunos com dados simulados: ${students.length}`);
    console.log(`   - Estados simulados: Sem currículo, Currículo, Candidatura, Pré-aprovado, Entrevista, Contratado\n`);

  } catch (error) {
    console.error('❌ Erro ao popular dados:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

populateClassData();
