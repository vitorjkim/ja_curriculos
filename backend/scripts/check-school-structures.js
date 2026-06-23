import pool from '../config/database.js';

const check = async () => {
  const client = await pool.connect();
  try {
    const tables = ['courses','students','student_evaluations','school_classes','school_class_students','external_applications'];
    for(const t of tables){
      try{
        const r = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${t}`);
        console.log(`${t}: exists, rows=${r.rows[0].cnt}`);
      }catch(e){
        console.log(`${t}: missing or error - ${e.message}`);
      }
    }
    const usersCols = ['school_name','students_limit','featured_students_limit'];
    for(const c of usersCols){
      try{
        const r = await client.query(`SELECT COUNT(${c}) FROM users`);
        console.log(`users.${c}: exists`);
      }catch(e){
        console.log(`users.${c}: missing`);
      }
    }
  }catch(e){ console.error(e); }finally{ client.release(); await pool.end(); }
};
check();
