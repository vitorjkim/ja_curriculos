import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

async function createTestCandidate() {
  try {
    console.log('✅ Conectado ao banco PostgreSQL');
    
    // Verificar se candidato já existe
    const existingCandidate = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND type = $2',
      ['candidato@teste.com', 'candidate']
    );
    
    if (existingCandidate.rows.length > 0) {
      console.log('👤 Candidato de teste já existe:', existingCandidate.rows[0].id);
      return existingCandidate.rows[0].id;
    }
    
    // Criar novo candidato (usando hash simples para teste)
    const simpleHash = 'hash_123456'; // Em produção use bcrypt
    const candidateId = uuidv4();
    
    await pool.query(
      `INSERT INTO users (id, name, email, password, type, phone, location, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        candidateId,
        'João Silva',
        'candidato@teste.com',
        simpleHash,
        'candidate',
        '(11) 99999-9999',
        'São Paulo, SP'
      ]
    );
    
    console.log('✅ Candidato de teste criado com sucesso!');
    console.log('📧 Email: candidato@teste.com');
    console.log('🔑 Senha: 123456');
    console.log('👤 ID:', candidateId);
    
    // Criar alguns currículos de exemplo
    const resumeId1 = uuidv4();
    const resumeId2 = uuidv4();
    
    await pool.query(
      `INSERT INTO resumes (id, user_id, title, summary, skills, experience, education, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        resumeId1,
        candidateId,
        'Desenvolvedor Frontend',
        'Desenvolvedor com experiência em React e TypeScript',
        JSON.stringify(['React', 'TypeScript', 'JavaScript', 'CSS']),
        JSON.stringify([{
          company: 'Tech Company',
          position: 'Desenvolvedor Jr',
          startDate: '2023-01',
          endDate: '2024-01',
          description: 'Desenvolvimento de aplicações web'
        }]),
        JSON.stringify([{
          institution: 'Universidade ABC',
          course: 'Ciência da Computação',
          startDate: '2020-01',
          endDate: '2024-01'
        }])
      ]
    );
    
    await pool.query(
      `INSERT INTO resumes (id, user_id, title, summary, skills, experience, education, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        resumeId2,
        candidateId,
        'Desenvolvedor Full Stack',
        'Desenvolvedor full stack com experiência em Node.js e React',
        JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Express']),
        JSON.stringify([{
          company: 'Startup XYZ',
          position: 'Desenvolvedor Full Stack',
          startDate: '2024-02',
          endDate: null,
          description: 'Desenvolvimento de APIs e interfaces'
        }]),
        JSON.stringify([{
          institution: 'Universidade ABC',
          course: 'Ciência da Computação',
          startDate: '2020-01',
          endDate: '2024-01'
        }])
      ]
    );
    
    console.log('📄 2 currículos de exemplo criados');
    
    // Criar algumas candidaturas
    const jobs = await pool.query('SELECT id FROM jobs LIMIT 2');
    
    if (jobs.rows.length > 0) {
      for (const job of jobs.rows) {
        const applicationId = uuidv4();
        await pool.query(
          `INSERT INTO applications (id, job_id, candidate_id, resume_id, status, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [applicationId, job.id, candidateId, resumeId1, 'pending']
        );
      }
      console.log(`💼 ${jobs.rows.length} candidaturas criadas`);
    }
    
    return candidateId;
    
  } catch (error) {
    console.error('❌ Erro ao criar candidato de teste:', error);
  } finally {
    await pool.end();
  }
}

createTestCandidate();
