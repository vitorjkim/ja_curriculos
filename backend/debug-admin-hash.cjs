const { Pool } = require('pg');
const pool = new Pool({ user:'postgres',host:'localhost',database:'curriculoja',password:'admin',port:5432 });
(async ()=>{ try { const r = await pool.query("SELECT email,password FROM users WHERE email = 'admin@curriculoja.com'"); console.log(r.rows[0]); } catch(e){ console.error(e); } finally { await pool.end(); } })();
