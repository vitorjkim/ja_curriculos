import pool from '../config/database.js';

// Script para criar as tabelas do banco de dados

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Iniciando criação das tabelas...');

    // Habilitar extensão UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        company_name VARCHAR(255),
        phone VARCHAR(20),
        cpf VARCHAR(14),
        cnpj VARCHAR(18),
        type VARCHAR(20) NOT NULL CHECK (type IN ('candidate', 'company', 'admin')),
        is_admin BOOLEAN DEFAULT FALSE,
        disabled BOOLEAN DEFAULT FALSE,
        profile_image VARCHAR(500),
        bio TEXT,
    subscription_plan VARCHAR(20) DEFAULT 'free',
    subscription_status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  // Garantir colunas de assinatura para bases existentes
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free'`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'`);
  // Garantir coluna de avatar para bases existentes
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500)`);
  // Garantir coluna bio (algumas bases antigas podem não ter)
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
  // Garantir coluna updated_at (se faltou em migrações antigas)
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  // Garantir que profile_image tenha tipo TEXT (base64 pode exceder 500 chars)
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'profile_image' AND data_type <> 'text'
      ) THEN
        ALTER TABLE users ALTER COLUMN profile_image TYPE TEXT;
      END IF;
    END
    $$;
  `);

    // Tabela de currículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        template VARCHAR(50) DEFAULT 'default',
        is_public BOOLEAN DEFAULT TRUE,
        personal_info JSONB,
        experience JSONB,
        education JSONB,
        skills JSONB,
        languages JSONB,
        projects JSONB,
        courses JSONB,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de vagas
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        benefits TEXT,
        salary_min DECIMAL(10, 2),
        salary_max DECIMAL(10, 2),
        location VARCHAR(255),
        work_type VARCHAR(50) CHECK (work_type IN ('presencial', 'remoto', 'hibrido')),
        contract_type VARCHAR(50) CHECK (contract_type IN ('clt', 'pj', 'estagio', 'temporario')),
        experience_level VARCHAR(50) CHECK (experience_level IN ('junior', 'pleno', 'senior', 'estagio')),
        is_active BOOLEAN DEFAULT TRUE,
        featured BOOLEAN DEFAULT FALSE,
        applications_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de candidaturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
        resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
        cover_letter TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'interested', 'interview', 'approved', 'rejected')),
        notes TEXT,
        interview_date TIMESTAMP,
        interview_mode VARCHAR(50), -- online, presencial, hibrido
        interview_location VARCHAR(200),
        interview_link TEXT,
        interview_notes TEXT,
        interview_confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, candidate_id)
      )
    `);

    // Tabela de jornada do candidato
    await client.query(`
      CREATE TABLE IF NOT EXISTS journey_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        step_id VARCHAR(100) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, step_id)
      )
    `);

    // Tabela de tokens de sessão/refresh
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de logs de ações
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id UUID,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ================= CHAT & FOLLOW TABLES =================
    // Tabela de favoritos (empresa salva candidato)
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NULL REFERENCES jobs(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, candidate_id, job_id)
      )
    `);
    // Tabela de seguimentos candidato -> empresa
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_follows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, company_id)
      )
    `);

    // Tabela de conversas
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, company_id)
      )
    `);

    // Tabela de mensagens de conversas
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
      CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
      CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
      CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_journey_user_id ON journey_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_user_id ON activity_logs(user_id);
      -- Chat & follow indices
      CREATE INDEX IF NOT EXISTS idx_company_follows_candidate ON company_follows(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_company_follows_company ON company_follows(company_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_candidate ON conversations(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);
    `);

      // ========== VISUALIZAÇÕES DE PERFIL DO ALUNO (por empresas) ==========
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_profile_views (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, company_id)
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_profile_views_student ON student_profile_views(student_id);
      `);

      // Likes em comentários de alunos
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_comment_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          comment_id UUID NOT NULL REFERENCES student_post_comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(comment_id, user_id)
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_student_comment_likes_comment ON student_comment_likes(comment_id);
      `);

    // ========== POSTS DAS ESCOLAS ==========
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_post_likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES school_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_post_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES school_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_school_posts_school ON school_posts(school_id);
      CREATE INDEX IF NOT EXISTS idx_school_posts_created ON school_posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_school_post_likes_post ON school_post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_school_post_comments_post ON school_post_comments(post_id);
    `);

    // Comentários: likes e replies (parent_id)
    await client.query(`
      ALTER TABLE school_post_comments
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES school_post_comments(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_school_post_comments_parent ON school_post_comments(parent_id);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_comment_likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        comment_id UUID NOT NULL REFERENCES school_post_comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_id)
      )
    `);

    // ========== POSTS DOS ALUNOS (CANDIDATES) ==========
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_post_likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_post_comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        parent_id UUID NULL REFERENCES student_post_comments(id) ON DELETE CASCADE
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_student_posts_candidate ON student_posts(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_student_posts_created ON student_posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_student_post_likes_post ON student_post_likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_student_post_comments_post ON student_post_comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_student_post_comments_parent ON student_post_comments(parent_id);
    `);

    // Função para atualizar updated_at automaticamente
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Triggers para atualizar updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_resumes_updated_at ON resumes;
      CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
      CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
      CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Todas as tabelas foram criadas com sucesso!');
    console.log('📊 Estrutura do banco:');
    console.log('   - users: Usuários do sistema');
    console.log('   - resumes: Currículos');
    console.log('   - jobs: Vagas de emprego');
    console.log('   - applications: Candidaturas');
    console.log('   - journey_progress: Progresso da jornada');
    console.log('   - user_sessions: Sessões de usuário');
    console.log('   - activity_logs: Logs de atividade');
  console.log('   - school_posts: Publicações das escolas');
  console.log('   - school_post_likes: Curtidas em publicações');
  console.log('   - school_post_comments: Comentários em publicações');
  console.log('   - student_posts: Publicações dos alunos');
  console.log('   - student_post_likes: Curtidas em publicações de alunos');
  console.log('   - student_post_comments: Comentários em publicações de alunos');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default createTables;
