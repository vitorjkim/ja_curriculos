import pool from '../config/database.js';

const createSchoolSystem = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🏫 Criando sistema de escolas...\n');

    // 1. Adicionar campos para escolas na tabela users
    console.log('1️⃣ Adicionando campos para escolas...');
    
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS school_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS school_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS school_address TEXT,
      ADD COLUMN IF NOT EXISTS school_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS school_state VARCHAR(50),
      ADD COLUMN IF NOT EXISTS school_cep VARCHAR(20),
      ADD COLUMN IF NOT EXISTS school_director VARCHAR(255),
      ADD COLUMN IF NOT EXISTS school_contact_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS school_website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mec_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS school_level VARCHAR(100);
    `);
    
    console.log('✅ Campos de escola adicionados à tabela users');

    // 2. Criar tabela de cursos
    console.log('\n2️⃣ Criando tabela de cursos...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_months INTEGER,
        level VARCHAR(50) CHECK (level IN ('tecnico', 'superior', 'pos_graduacao', 'mestrado', 'doutorado')),
        area VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tabela courses criada');

    // 3. Criar tabela de estudantes
    console.log('\n3️⃣ Criando tabela de estudantes...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
        student_registration VARCHAR(50),
        enrollment_date DATE,
        graduation_date DATE,
        current_semester INTEGER,
        total_semesters INTEGER,
        gpa DECIMAL(4,2),
        status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'dropped')),
        notes TEXT,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        birth_date DATE,
        gender VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id),
        UNIQUE(school_id, student_registration)
      );
    `);
    
    console.log('✅ Tabela students criada');

    // 4. Criar tabela de análises/avaliações
    console.log('\n4️⃣ Criando tabela de análises...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_evaluations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        evaluation_type VARCHAR(50) CHECK (evaluation_type IN ('prova', 'trabalho', 'projeto', 'participacao', 'comportamento', 'geral')),
        score DECIMAL(5,2),
        max_score DECIMAL(5,2),
        grade VARCHAR(5),
        comments TEXT,
        evaluation_date DATE DEFAULT CURRENT_DATE,
        semester INTEGER,
        year INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tabela student_evaluations criada');

    // 5. Criar índices para melhor performance
    console.log('\n5️⃣ Criando índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
      CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
      CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
      CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id);
      CREATE INDEX IF NOT EXISTS idx_evaluations_student_id ON student_evaluations(student_id);
      CREATE INDEX IF NOT EXISTS idx_evaluations_date ON student_evaluations(evaluation_date);
    `);
    
    console.log('✅ Índices criados');

    // 6. Inserir escola de exemplo
    console.log('\n6️⃣ Criando escola de exemplo...');
    
    const schoolExists = await client.query(`
      SELECT id FROM users WHERE email = 'escola@exemplo.com' AND type = 'school'
    `);
    
    if (schoolExists.rows.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('escola123', 10);
      
      const schoolResult = await client.query(`
        INSERT INTO users (
          email, password, name, type, school_name, school_type, 
          school_address, school_city, school_state, school_cep,
          school_director, school_contact_phone, mec_code, school_level,
          created_at
        ) VALUES (
          'escola@exemplo.com', $1, 'Administrador Escola', 'school',
          'Instituto de Tecnologia Exemplo', 'tecnico',
          'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567',
          'Dr. João Silva', '(11) 1234-5678', 'MEC123456', 'tecnico_superior',
          NOW()
        ) RETURNING id, school_name
      `, [hashedPassword]);
      
      const schoolId = schoolResult.rows[0].id;
      console.log('✅ Escola criada:', schoolResult.rows[0].school_name);

      // Criar cursos de exemplo
      await client.query(`
        INSERT INTO courses (school_id, name, description, duration_months, level, area) VALUES
        ($1, 'Técnico em Informática', 'Curso técnico em desenvolvimento de sistemas', 18, 'tecnico', 'Tecnologia'),
        ($1, 'Técnico em Administração', 'Curso técnico em gestão empresarial', 24, 'tecnico', 'Gestão'),
        ($1, 'Análise e Desenvolvimento de Sistemas', 'Curso superior em desenvolvimento', 30, 'superior', 'Tecnologia')
      `, [schoolId]);
      
      console.log('✅ Cursos de exemplo criados');
    } else {
      console.log('ℹ️ Escola de exemplo já existe');
    }

    console.log('\n✅ Sistema de escolas criado com sucesso!');
    console.log('\n📋 Resumo do que foi criado:');
    console.log('- Campos adicionais na tabela users para escolas');
    console.log('- Tabela courses (cursos)');
    console.log('- Tabela students (estudantes)');
    console.log('- Tabela student_evaluations (avaliações)');
    console.log('- Escola de exemplo: escola@exemplo.com / escola123');

  } catch (error) {
    console.error('❌ Erro ao criar sistema de escolas:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

createSchoolSystem();
