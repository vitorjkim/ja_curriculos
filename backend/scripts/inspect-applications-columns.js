import pool from '../config/database.js';

async function inspect() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'applications'
      ORDER BY ordinal_position
    `);

    console.log('Existing columns in applications:');
    for (const r of res.rows) console.log('-', r.column_name, r.data_type);

    const expected = [
      'id','job_id','candidate_id','resume_id','cover_letter','status','decision_feedback','decision_at','final_approved','final_approved_at','created_at','updated_at',
      'interview_date','interview_mode','interview_location','interview_link','interview_notes','interview_confirmed','interview_confirmed_at','interview_rescheduled','interview_canceled_by_company','interview_canceled_at','interview_rejected_by_candidate','interview_rejected_at','interview_cancel_reason','last_rejected_interview_date','decision_by'
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
