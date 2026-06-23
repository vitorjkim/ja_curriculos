import pool from '../config/database.js';

const createTestSchools = async () => {
  const client = await pool.connect();
  try {
    console.log('🏫 Inserindo escolas de teste...');

    // Garantir colunas de escola existirem (idempotente)
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

    // Verificar e atualizar constraint de tipo de usuário para incluir 'school'
    try {
      const cons = await client.query("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype='c' AND conname='users_type_check'");
      const def = cons.rows[0]?.def || '';
      if (!def.includes('school')) {
        console.log('🔧 Atualizando constraint users_type_check para incluir \"school\"');
        await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_type_check`);
        await client.query(`ALTER TABLE users ADD CONSTRAINT users_type_check CHECK (type IN ('candidate','company','admin','school'))`);
        console.log('✅ Constraint atualizada');
      } else {
        console.log('✅ Constraint users_type_check já inclui school');
      }
    } catch (e) {
      console.warn('⚠️ Não foi possível inspecionar/atualizar constraint users_type_check:', e.message || e);
    }

    const bcrypt = await import('bcryptjs');

    const schools = [
      {
        email: 'escola.alpha@example.com',
        password: 'escola123',
        school_name: 'Escola Alpha',
        school_type: 'tecnico',
        city: 'São Paulo',
        state: 'SP',
        phone: '(11) 4000-0001',
        mec: 'MEC-ALPHA-001'
      },
      {
        email: 'escola.beta@example.com',
        password: 'escola123',
        school_name: 'Escola Beta',
        school_type: 'superior',
        city: 'Campinas',
        state: 'SP',
        phone: '(19) 4000-0002',
        mec: 'MEC-BETA-002'
      },
      {
        email: 'escola.gamma@example.com',
        password: 'escola123',
        school_name: 'Escola Gamma',
        school_type: 'tecnico',
        city: 'Santos',
        state: 'SP',
        phone: '(13) 4000-0003',
        mec: 'MEC-GAMMA-003'
      }
    ];

    for (const s of schools) {
      const exists = await client.query('SELECT id FROM users WHERE email=$1', [s.email]);
      if (exists.rows.length > 0) {
        console.log(`ℹ️ Escola já existe: ${s.email}`);
        continue;
      }
      const hashed = await bcrypt.default.hash(s.password, 10);
      const ins = await client.query(`
        INSERT INTO users (email, password, type, school_name, school_type, school_city, school_state, school_contact_phone, mec_code, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING id
      `, [s.email, hashed, 'school', s.school_name, s.school_type, s.city, s.state, s.phone, s.mec]);
      console.log('✅ Escola criada:', s.school_name, ins.rows[0].id);
    }

    console.log('🏁 Inserção de escolas de teste finalizada.');
  } catch (err) {
    console.error('Erro ao inserir escolas de teste:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

createTestSchools();
