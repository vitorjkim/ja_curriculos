import pool from '../config/database.js';

async function inspect() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('Existing columns in users:');
    for (const r of res.rows) console.log('-', r.column_name, r.data_type);

    const expected = [
      'id','email','password','name','company_name','phone','cpf','cnpj','type',
      'is_admin','bio','created_at','updated_at','subscription_plan','subscription_status',
      'school_name','school_type','school_director','school_contact_phone','school_city','school_state','school_website',
      'profile_image','is_agency','disabled'
    ];

    const existing = new Set(res.rows.map(r => r.column_name));
    const missing = expected.filter(c => !existing.has(c));

    console.log('\nExpected columns missing:');
    if (missing.length === 0) console.log(' - None'); else missing.forEach(c => console.log(' -', c));

  } catch (e) {
    console.error('Inspect failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

inspect();
