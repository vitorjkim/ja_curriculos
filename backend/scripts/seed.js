import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

// Script para popular o banco com dados iniciais

const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Verificar se já existem usuários
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('📋 Banco já possui dados. Pulando seed.');
      return;
    }

    // Hash para senhas
    const hashPassword = async (password) => {
      return await bcrypt.hash(password, 10);
    };

    // Criar usuário administrador padrão
    const adminPasswordHash = await hashPassword('admin123');
    await client.query(`
      INSERT INTO users (email, password, name, type, is_admin, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, ['admin@curriculoja.com', adminPasswordHash, 'Administrador', 'admin', true]);

    // Criar empresa de exemplo
    const companyPasswordHash = await hashPassword('empresa123');
    const companyResult = await client.query(`
      INSERT INTO users (email, password, company_name, phone, cnpj, type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, ['empresa@exemplo.com', companyPasswordHash, 'Tech Solutions Ltda', '(11) 99999-9999', '12.345.678/0001-90', 'company']);
    
    const companyId = companyResult.rows[0].id;

    // Criar candidato de exemplo
    const candidatePasswordHash = await hashPassword('candidato123');
    const candidateResult = await client.query(`
      INSERT INTO users (email, password, name, phone, cpf, type, bio, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `, [
      'candidato@exemplo.com', 
      candidatePasswordHash, 
      'João Silva', 
      '(11) 88888-8888', 
      '123.456.789-00', 
      'candidate',
      'Desenvolvedor apaixonado por tecnologia com experiência em React e Node.js.'
    ]);
    
    const candidateId = candidateResult.rows[0].id;

    // Criar vaga de exemplo
    await client.query(`
      INSERT INTO jobs (
        company_id, title, description, requirements, benefits,
        salary_min, salary_max, location, work_type, contract_type, experience_level
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      companyId,
      'Desenvolvedor React Júnior',
      'Estamos procurando um desenvolvedor React júnior para integrar nossa equipe de desenvolvimento. Você trabalhará em projetos inovadores e terá oportunidade de crescer profissionalmente.',
      'Conhecimento em React, JavaScript ES6+, HTML5, CSS3. Conhecimento em Git é um diferencial.',
      'Vale alimentação, vale transporte, plano de saúde, ambiente descontraído, home office flexível.',
      3000.00,
      5000.00,
      'São Paulo, SP',
      'hibrido',
      'clt',
      'junior'
    ]);

    // Criar currículo de exemplo para o candidato
    const resumeData = {
      personalInfo: {
        name: 'João Silva',
        email: 'candidato@exemplo.com',
        phone: '(11) 88888-8888',
        location: 'São Paulo, SP',
        linkedin: 'linkedin.com/in/joao-silva',
        github: 'github.com/joaosilva'
      },
      experience: [{
        company: 'Startup Tech',
        position: 'Desenvolvedor Frontend',
        startDate: '2023-01',
        endDate: 'presente',
        description: 'Desenvolvimento de interfaces web usando React.js, implementação de designs responsivos e integração com APIs REST.'
      }],
      education: [{
        institution: 'Universidade de São Paulo',
        degree: 'Bacharelado em Ciência da Computação',
        startDate: '2019-01',
        endDate: '2022-12'
      }],
      skills: ['React.js', 'JavaScript', 'HTML5', 'CSS3', 'Git', 'Node.js', 'MongoDB'],
      languages: [{
        language: 'Português',
        level: 'Nativo'
      }, {
        language: 'Inglês',
        level: 'Intermediário'
      }]
    };

    await client.query(`
      INSERT INTO resumes (user_id, title, template, is_public, personal_info, experience, education, skills, languages, projects, courses)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      candidateId,
      'Currículo - Desenvolvedor Frontend',
      'modern',
      true,
      JSON.stringify(resumeData.personalInfo),
      JSON.stringify(resumeData.experience),
      JSON.stringify(resumeData.education),
      JSON.stringify(resumeData.skills),
      JSON.stringify(resumeData.languages),
      JSON.stringify([]), // projects - empty array
      JSON.stringify([])  // courses - empty array
    ]);

    console.log('✅ Seed concluído com sucesso!');
    console.log('👤 Usuários criados:');
    console.log('   - Admin: admin@curriculoja.com / admin123');
    console.log('   - Empresa: empresa@exemplo.com / empresa123');
    console.log('   - Candidato: candidato@exemplo.com / candidato123');
    console.log('💼 1 vaga de exemplo criada');
    console.log('📄 1 currículo de exemplo criado');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default seedDatabase;
