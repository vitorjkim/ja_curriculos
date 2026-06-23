import pool from '../config/database.js';

async function run(){
  const client = await pool.connect();
  try{
    const userId = '1f2383d8-1d65-4797-be86-b25c862b7236'; // empresa@exemplo.com
    // call ensureInterviewSchema SQL similar to route
    await client.query(`ALTER TABLE applications 
      ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS interview_location TEXT,
      ADD COLUMN IF NOT EXISTS interview_link TEXT,
      ADD COLUMN IF NOT EXISTS interview_notes TEXT,
      ADD COLUMN IF NOT EXISTS interview_confirmed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_confirmed_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_rescheduled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_canceled_by_company BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_canceled_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_rejected_by_candidate BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS interview_rejected_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS interview_cancel_reason TEXT,
      ADD COLUMN IF NOT EXISTS last_rejected_interview_date TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS final_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS decision_feedback TEXT,
      ADD COLUMN IF NOT EXISTS decision_by UUID NULL,
      ADD COLUMN IF NOT EXISTS decision_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'applications' AND column_name IN (
      'interview_date','interview_mode','interview_location','interview_link','interview_confirmed','interview_notes',
      'interview_rescheduled','interview_canceled_by_company','interview_canceled_at','interview_rejected_by_candidate','interview_rejected_at','interview_cancel_reason'
    )`);
    const found = cols.rows.map(r=>r.column_name);
    const interviewColumnsAvailable = ['interview_date','interview_mode','interview_location','interview_link','interview_confirmed','interview_notes','interview_rescheduled','interview_canceled_by_company','interview_canceled_at','interview_rejected_by_candidate','interview_rejected_at','interview_cancel_reason']
      .every(c => found.includes(c));

    console.log('interviewColumnsAvailable:', interviewColumnsAvailable);

    const q = interviewColumnsAvailable ? `
        SELECT 
          a.id,
          a.job_id,
          a.candidate_id,
          a.resume_id,
          a.cover_letter,
          a.status,
          a.interview_date,
          a.interview_mode,
          a.interview_location,
          a.interview_link,
          a.interview_confirmed,
          a.interview_rescheduled,
          a.interview_canceled_by_company,
          a.interview_canceled_at,
          a.interview_rejected_by_candidate,
          a.interview_rejected_at,
          a.final_approved,
          a.final_approved_at,
          a.decision_feedback,
          to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
          a.created_at,
          j.title as job_title,
          j.location,
          u.name as candidate_name,
          u.email as candidate_email,
          u.phone as candidate_phone,
          u.profile_image as candidate_profile_image,
          r.title as resume_title,
          r.template as resume_template,
          r.original_file_path as resume_file_path
        FROM applications a
        JOIN jobs j ON a.job_id = j.id AND j.company_id = $1
        JOIN users u ON a.candidate_id = u.id
        LEFT JOIN resumes r ON a.resume_id = r.id
        ORDER BY a.created_at DESC` : `
        SELECT 
          a.id,
          a.job_id,
          a.candidate_id,
          a.resume_id,
          a.cover_letter,
          a.status,
          a.decision_feedback,
          to_char(a.decision_at,'YYYY-MM-DD HH24:MI:SS') as decision_at,
          a.created_at,
          j.title as job_title,
          j.location,
          u.name as candidate_name,
          u.email as candidate_email,
          u.phone as candidate_phone,
          u.profile_image as candidate_profile_image,
          r.title as resume_title,
          r.template as resume_template,
          r.original_file_path as resume_file_path
        FROM applications a
        JOIN jobs j ON a.job_id = j.id AND j.company_id = $1
        JOIN users u ON a.candidate_id = u.id
        LEFT JOIN resumes r ON a.resume_id = r.id
        ORDER BY a.created_at DESC`;

    const result = await client.query(q, [userId]);
    console.log('Query succeeded, rows:', result.rows.length);
  }catch(e){
    console.error('Replicate error:', e);
    process.exitCode = 1;
  } finally {client.release(); await pool.end();}
}

run();
