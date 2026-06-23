import pool from '../config/database.js';

async function run(){
  const client = await pool.connect();
  try{
    const res = await client.query("SELECT id,email FROM users WHERE type='company' LIMIT 1");
    if(res.rows.length===0) console.log('No company user found'); else console.log('Company user:', res.rows[0]);
  }catch(e){console.error(e);process.exitCode=1;}finally{client.release();await pool.end();}
}
run();
