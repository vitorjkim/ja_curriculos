import pool from './config/database.js';
import bcrypt from 'bcryptjs';

const createSampleData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🏢 Criando dados de exemplo...');

    // Primeiro, criar uma empresa se não existir
    const companyResult = await client.query(`
      INSERT INTO users (email, password, company_name, phone, cnpj, type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [
      'empresa@exemplo.com', 
      await bcrypt.hash('empresa123', 10), 
      'Tech Solutions Ltda', 
      '(11) 99999-9999', 
      '12.345.678/0001-90', 
      'company'
    ]);

    let companyId;
    if (companyResult.rows.length > 0) {
      companyId = companyResult.rows[0].id;
    } else {
      // Se já existe, buscar o ID
      const existingCompany = await client.query(
        "SELECT id FROM users WHERE email = 'empresa@exemplo.com'"
      );
      companyId = existingCompany.rows[0].id;
    }

    console.log('✅ Empresa criada/encontrada. ID:', companyId);

    // Criar algumas vagas de exemplo
    const jobs = [
      {
        title: 'Desenvolvedor React Júnior',
        description: 'Estamos procurando um desenvolvedor React júnior para integrar nossa equipe de desenvolvimento. Você trabalhará em projetos inovadores e terá oportunidade de crescer profissionalmente.',
        requirements: 'Conhecimento em React, JavaScript ES6+, HTML5, CSS3. Conhecimento em Git é um diferencial.',
        benefits: 'Vale alimentação, vale transporte, plano de saúde, ambiente descontraído, home office flexível.',
        salary_min: 3000.00,
        salary_max: 5000.00,
        location: 'São Paulo, SP',
        work_type: 'hibrido',
        contract_type: 'clt',
        experience_level: 'junior'
      },
      {
        title: 'Designer UX/UI Pleno',
        description: 'Buscamos um designer experiente para criar interfaces incríveis e experiências de usuário memoráveis. Você será responsável por todo o processo de design, desde a pesquisa até a entrega final.',
        requirements: 'Experiência com Figma, Adobe Creative Suite, prototipação, testes de usabilidade. Portfolio obrigatório.',
        benefits: 'Plano de saúde e dental, vale refeição, auxílio home office, day off no aniversário.',
        salary_min: 5000.00,
        salary_max: 8000.00,
        location: 'Rio de Janeiro, RJ',
        work_type: 'remoto',
        contract_type: 'pj',
        experience_level: 'pleno'
      },
      {
        title: 'Estágio em Desenvolvimento Full Stack',
        description: 'Oportunidade única para estudantes que desejam iniciar sua carreira em desenvolvimento. Você trabalhará com tecnologias modernas e terá mentoria de desenvolvedores seniores.',
        requirements: 'Cursando Ciência da Computação, Sistemas de Informação ou afins. Conhecimentos básicos em programação.',
        benefits: 'Bolsa auxílio, vale transporte, ambiente jovem e dinâmico, possibilidade de efetivação.',
        salary_min: 1200.00,
        salary_max: 1500.00,
        location: 'Belo Horizonte, MG',
        work_type: 'presencial',
        contract_type: 'estagio',
        experience_level: 'estagio'
      }
    ];

    for (const job of jobs) {
      await client.query(`
        INSERT INTO jobs (
          company_id, title, description, requirements, benefits,
          salary_min, salary_max, location, work_type, contract_type, experience_level,
          is_active, featured, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `, [
        companyId,
        job.title,
        job.description,
        job.requirements,
        job.benefits,
        job.salary_min,
        job.salary_max,
        job.location,
        job.work_type,
        job.contract_type,
        job.experience_level,
        true, // is_active
        false // featured
      ]);
    }

    console.log('✅ Dados de exemplo criados com sucesso!');
    console.log('📝 3 vagas foram adicionadas ao sistema');
    console.log('🏢 Empresa: Tech Solutions Ltda (empresa@exemplo.com)');

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createSampleData();
