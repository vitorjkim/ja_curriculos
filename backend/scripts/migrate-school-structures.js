import pool from '../config/database.js';

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Iniciando migração das estruturas escolares (idempotente)...');

    // Garantir colunas em users
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR(255)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_type VARCHAR(100)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_address TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_city VARCHAR(100)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_state VARCHAR(50)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_cep VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_director VARCHAR(255)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_contact_phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_website VARCHAR(255)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mec_code VARCHAR(50)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_level VARCHAR(100)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS students_limit INTEGER`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS featured_students_limit INTEGER`);

    // courses
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_months INTEGER,
        level VARCHAR(50),
        area VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // students
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
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        birth_date DATE,
        gender VARCHAR(20),
        class_id UUID REFERENCES school_classes(id) ON DELETE SET NULL,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id),
        UNIQUE(school_id, student_registration)
      );
    `);

    // student_evaluations
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_evaluations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        evaluation_type VARCHAR(50),
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

    // school_classes
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        year INTEGER,
        shift VARCHAR(30),
        job_area VARCHAR(100),
        job_subarea VARCHAR(100),
        job_location VARCHAR(120),
        job_work_type VARCHAR(30),
        job_contract_type VARCHAR(30),
        job_experience_level VARCHAR(30),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // school_class_students (junction)
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_class_students (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(class_id, student_id)
      );
    `);

    // external_applications
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agency_id UUID,
        student_email TEXT,
        student_name TEXT,
        student_id UUID,
        job_title TEXT,
        company_name TEXT,
        external_url TEXT,
        status TEXT DEFAULT 'applied',
        applied_at TIMESTAMP,
        notes TEXT,
        source_file TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // indexes commonly used
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_school_classes_school ON school_classes(school_id)`);

    console.log('✅ Migração das estruturas escolares concluída');
  } catch (err) {
    console.error('Erro durante migração escolar:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
