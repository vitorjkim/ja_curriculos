const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'curriculoja',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function createSchoolsCompaniesData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Hash padrão para senhas
    const passwordHash = await bcrypt.hash('senha123', 10);

    console.log('📚 Criando escolas...');
    
    // Criar SENAI
    const senaiResult = await client.query(`
      INSERT INTO users (email, password, name, school_name, school_type, school_level, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `, ['senai@escola.com', passwordHash, 'SENAI São Paulo', 'SENAI São Paulo', 'Escola Técnica', 'Técnico', 'school']);
    
    const senaiId = senaiResult.rows[0].id;
    console.log('✅ SENAI criado:', senaiId);
    
    // Criar USP
    const uspResult = await client.query(`
      INSERT INTO users (email, password, name, school_name, school_type, school_level, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `, ['usp@universidade.com', passwordHash, 'USP - Universidade de São Paulo', 'Universidade de São Paulo', 'Universidade', 'Superior', 'school']);
    
    const uspId = uspResult.rows[0].id;
    console.log('✅ USP criada:', uspId);
    
    // Criar UNICAMP
    const unicampResult = await client.query(`
      INSERT INTO users (email, password, name, school_name, school_type, school_level, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `, ['unicamp@universidade.com', passwordHash, 'UNICAMP - Universidade Estadual de Campinas', 'Universidade Estadual de Campinas', 'Universidade', 'Superior', 'school']);
    
    const unicampId = unicampResult.rows[0].id;
    console.log('✅ UNICAMP criada:', unicampId);

    console.log('\n👨‍🎓 Criando alunos do SENAI...');
    
    // Alunos SENAI
    const senaiStudents = [
      { name: 'Carlos Silva', email: 'carlos.silva@senai.com', course: 'Técnico em Mecânica', phone: '(11) 98765-1111', cpf: '111.111.111-11' },
      { name: 'Mariana Santos', email: 'mariana.santos@senai.com', course: 'Técnico em Eletrônica', phone: '(11) 98765-2222', cpf: '222.222.222-22' },
      { name: 'Roberto Lima', email: 'roberto.lima@senai.com', course: 'Técnico em Eletrotécnica', phone: '(11) 98765-3333', cpf: '333.333.333-33' },
      { name: 'Ana Paula Costa', email: 'ana.costa@senai.com', course: 'Técnico em Automação Industrial', phone: '(11) 98765-4444', cpf: '444.444.444-44' }
    ];

    for (const student of senaiStudents) {
      const userResult = await client.query(`
        INSERT INTO users (email, password, name, phone, cpf, type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `, [student.email, passwordHash, student.name, student.phone, student.cpf, 'candidate']);
      
      const userId = userResult.rows[0].id;
      
      // Criar currículo básico
      await client.query(`
        INSERT INTO resumes (user_id, title, template, is_public, 
          personal_info, 
          education, 
          skills, 
          created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        userId,
        `Currículo - ${student.name}`,
        'modern',
        true,
        JSON.stringify({
          name: student.name,
          email: student.email,
          phone: student.phone,
          location: 'São Paulo, SP'
        }),
        JSON.stringify([{
          institution: 'SENAI São Paulo',
          degree: student.course,
          startDate: '2022-01',
          endDate: '2024-12',
          current: true,
          description: 'Formação técnica com foco em aplicações práticas industriais.'
        }]),
        JSON.stringify([
          'Leitura de desenho técnico',
          'Operação de máquinas',
          'Manutenção preventiva',
          'Controle de qualidade'
        ])
      ]);
      
      console.log(`✅ Aluno SENAI criado: ${student.name}`);
    }

    console.log('\n👨‍🎓 Criando alunos da USP...');
    
    // Alunos USP
    const uspStudents = [
      { name: 'Felipe Oliveira', email: 'felipe.oliveira@usp.br', course: 'Engenharia de Computação', phone: '(11) 98765-5555', cpf: '555.555.555-55' },
      { name: 'Juliana Ferreira', email: 'juliana.ferreira@usp.br', course: 'Ciência da Computação', phone: '(11) 98765-6666', cpf: '666.666.666-66' },
      { name: 'Ricardo Alves', email: 'ricardo.alves@usp.br', course: 'Engenharia Elétrica', phone: '(11) 98765-7777', cpf: '777.777.777-77' },
      { name: 'Camila Rodrigues', email: 'camila.rodrigues@usp.br', course: 'Administração', phone: '(11) 98765-8888', cpf: '888.888.888-88' },
      { name: 'Bruno Martins', email: 'bruno.martins@usp.br', course: 'Economia', phone: '(11) 98765-9999', cpf: '999.999.999-99' }
    ];

    for (const student of uspStudents) {
      const userResult = await client.query(`
        INSERT INTO users (email, password, name, phone, cpf, type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `, [student.email, passwordHash, student.name, student.phone, student.cpf, 'candidate']);
      
      const userId = userResult.rows[0].id;
      
      // Criar currículo básico
      await client.query(`
        INSERT INTO resumes (user_id, title, template, is_public, 
          personal_info, 
          education, 
          skills, 
          created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        userId,
        `Currículo - ${student.name}`,
        'modern',
        true,
        JSON.stringify({
          name: student.name,
          email: student.email,
          phone: student.phone,
          location: 'São Paulo, SP'
        }),
        JSON.stringify([{
          institution: 'USP - Universidade de São Paulo',
          degree: `Bacharelado em ${student.course}`,
          startDate: '2020-01',
          endDate: '2024-12',
          current: true,
          description: 'Formação completa com base sólida em teoria e prática.'
        }]),
        JSON.stringify([
          'Programação',
          'Análise de dados',
          'Resolução de problemas',
          'Trabalho em equipe'
        ])
      ]);
      
      console.log(`✅ Aluno USP criado: ${student.name}`);
    }

    console.log('\n👨‍🎓 Criando alunos da UNICAMP...');
    
    // Alunos UNICAMP
    const unicampStudents = [
      { name: 'Leonardo Silva', email: 'leonardo.silva@unicamp.br', course: 'Engenharia de Software', phone: '(19) 98765-1111', cpf: '101.101.101-10' },
      { name: 'Beatriz Costa', email: 'beatriz.costa@unicamp.br', course: 'Sistemas de Informação', phone: '(19) 98765-2222', cpf: '202.202.202-20' },
      { name: 'Gabriel Santos', email: 'gabriel.santos@unicamp.br', course: 'Engenharia Mecânica', phone: '(19) 98765-3333', cpf: '303.303.303-30' },
      { name: 'Larissa Oliveira', email: 'larissa.oliveira@unicamp.br', course: 'Arquitetura e Urbanismo', phone: '(19) 98765-4444', cpf: '404.404.404-40' },
      { name: 'Thiago Ferreira', email: 'thiago.ferreira@unicamp.br', course: 'Design', phone: '(19) 98765-5555', cpf: '505.505.505-50' }
    ];

    for (const student of unicampStudents) {
      const userResult = await client.query(`
        INSERT INTO users (email, password, name, phone, cpf, type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `, [student.email, passwordHash, student.name, student.phone, student.cpf, 'candidate']);
      
      const userId = userResult.rows[0].id;
      
      // Criar currículo básico
      await client.query(`
        INSERT INTO resumes (user_id, title, template, is_public, 
          personal_info, 
          education, 
          skills, 
          created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        userId,
        `Currículo - ${student.name}`,
        'modern',
        true,
        JSON.stringify({
          name: student.name,
          email: student.email,
          phone: student.phone,
          location: 'Campinas, SP'
        }),
        JSON.stringify([{
          institution: 'UNICAMP - Universidade Estadual de Campinas',
          degree: `Bacharelado em ${student.course}`,
          startDate: '2020-01',
          endDate: '2024-12',
          current: true,
          description: 'Formação reconhecida com excelência acadêmica e pesquisa.'
        }]),
        JSON.stringify([
          'Pesquisa científica',
          'Metodologia ágil',
          'Inovação',
          'Pensamento crítico'
        ])
      ]);
      
      console.log(`✅ Aluno UNICAMP criado: ${student.name}`);
    }

    console.log('\n🏢 Criando empresas...');
    
    // Criar Google Brasil
    const googleResult = await client.query(`
      INSERT INTO users (email, password, name, company_name, cnpj, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, ['rh@google.com.br', passwordHash, 'Google Brasil', 'Google Brasil Ltda', '00.000.000/0001-00', 'company']);
    
    const googleId = googleResult.rows[0].id;
    console.log('✅ Google Brasil criada:', googleId);
    
    // Criar Microsoft Brasil
    const microsoftResult = await client.query(`
      INSERT INTO users (email, password, name, company_name, cnpj, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, ['rh@microsoft.com.br', passwordHash, 'Microsoft Brasil', 'Microsoft Informática Ltda', '00.000.000/0001-11', 'company']);
    
    const microsoftId = microsoftResult.rows[0].id;
    console.log('✅ Microsoft Brasil criada:', microsoftId);
    
    // Criar Amazon AWS Brasil
    const amazonResult = await client.query(`
      INSERT INTO users (email, password, name, company_name, cnpj, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, ['rh@amazon.com.br', passwordHash, 'Amazon AWS Brasil', 'Amazon Web Services Brasil Ltda', '00.000.000/0001-22', 'company']);
    
    const amazonId = amazonResult.rows[0].id;
    console.log('✅ Amazon AWS Brasil criada:', amazonId);

    console.log('\n💼 Criando vagas da Google Brasil...');
    
    // Vagas Google
    const googleJobs = [
      {
        title: 'Engenheiro de Software Frontend',
        description: 'Desenvolvimento de interfaces modernas usando React, TypeScript e Material UI. Trabalhe em produtos usados por milhões de usuários.',
        requirements: JSON.stringify(['React', 'TypeScript', 'HTML/CSS', 'Git', 'Inglês avançado']),
        salary_min: 12000,
        salary_max: 18000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'pleno'
      },
      {
        title: 'Engenheiro de Machine Learning',
        description: 'Desenvolvimento de modelos de ML para produtos do Google. Experiência com TensorFlow, PyTorch e grandes volumes de dados.',
        requirements: JSON.stringify(['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Estatística', 'Inglês fluente']),
        salary_min: 15000,
        salary_max: 22000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'senior'
      },
      {
        title: 'Product Manager - Cloud Solutions',
        description: 'Gestão de produtos de cloud computing. Trabalhe com equipes globais para definir roadmap e estratégia.',
        requirements: JSON.stringify(['Product Management', 'Cloud Computing', 'Análise de dados', 'Comunicação', 'Inglês fluente']),
        salary_min: 14000,
        salary_max: 20000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'senior'
      }
    ];

    for (const job of googleJobs) {
      await client.query(`
        INSERT INTO jobs (company_id, title, description, requirements, salary_min, salary_max, location, contract_type, experience_level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [googleId, job.title, job.description, job.requirements, job.salary_min, job.salary_max, job.location, job.contract_type, job.experience_level]);
      
      console.log(`✅ Vaga criada: ${job.title}`);
    }

    console.log('\n💼 Criando vagas da Microsoft Brasil...');
    
    // Vagas Microsoft
    const microsoftJobs = [
      {
        title: 'Desenvolvedor .NET Sênior',
        description: 'Desenvolvimento de aplicações enterprise com .NET Core, C# e Azure. Trabalhe em soluções escaláveis para grandes clientes.',
        requirements: JSON.stringify(['.NET Core', 'C#', 'Azure', 'SQL Server', 'Microserviços', 'Inglês intermediário']),
        salary_min: 11000,
        salary_max: 16000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'senior'
      },
      {
        title: 'Azure Solutions Architect',
        description: 'Arquitetura de soluções em nuvem usando Azure. Desenhe e implemente arquiteturas robustas e escaláveis.',
        requirements: JSON.stringify(['Azure', 'Cloud Architecture', 'DevOps', 'Terraform', 'Kubernetes', 'Inglês avançado']),
        salary_min: 16000,
        salary_max: 24000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'senior'
      },
      {
        title: 'Engenheiro DevOps',
        description: 'Automação de infraestrutura e pipelines CI/CD. Trabalhe com Azure DevOps, GitHub Actions e Kubernetes.',
        requirements: JSON.stringify(['DevOps', 'Azure', 'Kubernetes', 'Docker', 'CI/CD', 'Scripting']),
        salary_min: 10000,
        salary_max: 15000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'pleno'
      }
    ];

    for (const job of microsoftJobs) {
      await client.query(`
        INSERT INTO jobs (company_id, title, description, requirements, salary_min, salary_max, location, contract_type, experience_level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [microsoftId, job.title, job.description, job.requirements, job.salary_min, job.salary_max, job.location, job.contract_type, job.experience_level]);
      
      console.log(`✅ Vaga criada: ${job.title}`);
    }

    console.log('\n💼 Criando vagas da Amazon AWS Brasil...');
    
    // Vagas Amazon
    const amazonJobs = [
      {
        title: 'AWS Solutions Architect',
        description: 'Arquitetura de soluções AWS para clientes enterprise. Trabalhe com S3, EC2, Lambda, RDS e outros serviços AWS.',
        requirements: JSON.stringify(['AWS', 'Cloud Architecture', 'Networking', 'Security', 'Linux', 'Inglês fluente']),
        salary_min: 14000,
        salary_max: 20000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'senior'
      },
      {
        title: 'Engenheiro de Software Backend - Microserviços',
        description: 'Desenvolvimento de microserviços escaláveis usando Java, Spring Boot e AWS. Trabalhe em sistemas de alta disponibilidade.',
        requirements: JSON.stringify(['Java', 'Spring Boot', 'Microserviços', 'AWS', 'Docker', 'Inglês avançado']),
        salary_min: 12000,
        salary_max: 17000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'pleno'
      },
      {
        title: 'Engenheiro de Dados - Big Data',
        description: 'Construção de pipelines de dados em larga escala. Trabalhe com Spark, Hadoop, Redshift e EMR.',
        requirements: JSON.stringify(['Python', 'Spark', 'Hadoop', 'AWS', 'SQL', 'Big Data', 'Inglês avançado']),
        salary_min: 13000,
        salary_max: 19000,
        location: 'São Paulo, SP',
        contract_type: 'clt',
        experience_level: 'senior'
      }
    ];

    for (const job of amazonJobs) {
      await client.query(`
        INSERT INTO jobs (company_id, title, description, requirements, salary_min, salary_max, location, contract_type, experience_level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [amazonId, job.title, job.description, job.requirements, job.salary_min, job.salary_max, job.location, job.contract_type, job.experience_level]);
      
      console.log(`✅ Vaga criada: ${job.title}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Todos os dados foram criados com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('   - 3 escolas criadas (SENAI, USP, UNICAMP)');
    console.log('   - 14 alunos criados (4 SENAI, 5 USP, 5 UNICAMP)');
    console.log('   - 3 empresas criadas (Google, Microsoft, Amazon)');
    console.log('   - 9 vagas criadas (3 por empresa)');
    console.log('\n🔑 Senha para todas as contas: senha123');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createSchoolsCompaniesData().catch(err => {
  console.error('💥 Erro fatal:', err);
  process.exit(1);
});
