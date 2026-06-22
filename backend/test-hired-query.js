import pool from './config/database.js';

async function test() {
  try {
    // 1. Check external_applications
    const ext = await pool.query('SELECT id, student_id, student_name, status, job_title, company_name FROM external_applications');
    console.log('=== External Applications ===');
    console.log(ext.rows);
    
    // 2. Test the hired query (similar to what the endpoint does)
    const schoolId = 'ef37d761-91af-4730-baee-6b31ca3da416'; // SENAI school
    const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';
    
    const hired = await pool.query(`
      WITH combined_hired AS (
        SELECT 
          a.candidate_id AS user_id,
          a.final_approved_at,
          a.job_id,
          j.title AS job_title,
          j.company_id AS company_id,
          COALESCE(cu.name, cu.company_name, 'Empresa') AS company_name,
          'internal' AS source,
          ROW_NUMBER() OVER (PARTITION BY a.candidate_id ORDER BY a.final_approved_at DESC NULLS LAST, a.updated_at DESC) AS rn
        FROM applications a
        JOIN students s ON s.user_id=a.candidate_id
        LEFT JOIN jobs j ON j.id=a.job_id
        LEFT JOIN users cu ON j.company_id=cu.id
        WHERE s.school_id=$1 AND s.class_id=$2 AND COALESCE(a.final_approved,false)=true
      ), external_hired AS (
        SELECT 
          ea.student_id AS user_id,
          ea.applied_at AS final_approved_at,
          NULL::uuid AS job_id,
          ea.job_title,
          NULL::uuid AS company_id,
          COALESCE(ea.company_name, 'Empresa Externa') AS company_name,
          'external' AS source,
          ROW_NUMBER() OVER (PARTITION BY ea.student_id ORDER BY ea.applied_at DESC) AS rn
        FROM external_applications ea
        JOIN students s ON s.user_id=ea.student_id
        WHERE s.school_id=$1 AND s.class_id=$2 AND LOWER(ea.status) IN ('hired','contratado','aprovado','accepted','approved')
      ), all_hired AS (
        SELECT * FROM combined_hired WHERE rn=1
        UNION ALL
        SELECT * FROM external_hired WHERE rn=1
      ), deduped AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY source ASC) AS final_rn
        FROM all_hired
      )
      SELECT 
        u.id AS user_id,
        u.name, u.email, u.profile_image,
        d.job_id,
        d.job_title,
        d.company_id,
        d.company_name,
        d.final_approved_at,
        d.source
      FROM deduped d
      JOIN users u ON u.id=d.user_id
      WHERE d.final_rn=1
      ORDER BY d.final_approved_at DESC NULLS LAST, u.name ASC
    `, [schoolId, classId]);
    
    console.log('\n=== Hired Students (combined) ===');
    console.log(hired.rows);
    
    // 3. Test the student final_approved check
    const stuCheck = await pool.query(`
      SELECT u.name, 
        BOOL_OR(COALESCE(a.final_approved,false)) AS internal_approved,
        COALESCE(ext_hired.is_hired, false) AS ext_hired,
        BOOL_OR(COALESCE(a.final_approved,false)) OR COALESCE(ext_hired.is_hired, false) AS final_approved
      FROM students s
      JOIN users u ON s.user_id=u.id
      LEFT JOIN applications a ON a.candidate_id = s.user_id
      LEFT JOIN (SELECT student_id, true AS is_hired FROM external_applications WHERE LOWER(status) IN ('hired','contratado','aprovado','accepted','approved') GROUP BY student_id) ext_hired ON ext_hired.student_id = s.user_id
      WHERE s.class_id=$1
      GROUP BY u.name, ext_hired.is_hired
      ORDER BY u.name
    `, [classId]);
    
    console.log('\n=== Students final_approved check ===');
    console.log(stuCheck.rows);
    
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

test();
