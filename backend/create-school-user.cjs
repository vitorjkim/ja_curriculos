const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Ajuste se suas credenciais forem diferentes
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculoja',
  password: 'admin',
  port: 5432,
});

async function upsertSchool() {
  const email = 'senai@gmail.com';
  const plainPassword = '123456';

  console.log('🔧 Criando/atualizando escola:', email);

  try {
    // Gerar hash
    const hash = await bcrypt.hash(plainPassword, 10);

    // Descobrir colunas de escola existentes
    const meta = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name LIKE 'school_%'
    `);
    const schoolCols = meta.rows.map(r => r.column_name);

    // Valores padrão possíveis
    const defaults = {
      school_name: 'SENAI',
      school_type: 'Tecnica',
      school_address: 'Endereco SENAI',
      school_city: 'Sao Paulo',
      school_state: 'SP',
      school_cep: '00000-000',
      school_director: 'Diretor Exemplo',
      school_contact_phone: '+55 11 99999-0000',
      school_website: 'https://www.senai.example',
      mec_code: 'MEC123456',
      school_level: 'Tecnico'
    };

    const baseCols = ['name','email','password','type'];
    const baseVals = ['Escola SENAI', email, hash, 'school'];

    const extraCols = [];
    const extraVals = [];
    for (const c of schoolCols) {
      if (defaults[c] !== undefined) {
        extraCols.push(c);
        extraVals.push(defaults[c]);
      }
    }

    const allCols = [...baseCols, ...extraCols];
    const placeholders = allCols.map((_,i)=>'$'+(i+1));
    const allVals = [...baseVals, ...extraVals];

    const updateSet = allCols
      .filter(c => c !== 'email' && c !== 'type')
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(', ');

    const sql = `
      INSERT INTO users (${allCols.join(',')})
      VALUES (${placeholders.join(',')})
      ON CONFLICT (email) DO UPDATE SET
        ${updateSet},
        updated_at = NOW()
      RETURNING id, email, type, school_name, school_type;
    `;

    const result = await pool.query(sql, allVals);
    console.log('✅ Escola criada/atualizada:', result.rows[0]);
    console.log('🔑 Credenciais ->', email, '/', plainPassword);
  } catch (err) {
    console.error('❌ Erro ao criar escola:', err.message);
  } finally {
    await pool.end();
  }
}

upsertSchool();
