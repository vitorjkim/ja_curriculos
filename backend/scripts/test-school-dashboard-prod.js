import fetch from 'node-fetch';
const API='https://jacurriculos-production.up.railway.app/api';
const email='escola.alpha@example.com';
const password='escola123';
(async()=>{
  try{
    const login=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const lj=await login.json();
    if(!login.ok){ console.log('Login failed', login.status, lj); return; }
    const token=lj.token;
    const endpoints = [
      '/schools/licenses',
      '/schools/dashboard/stats',
      '/schools/dashboard/employability',
      '/schools/courses',
      '/schools/classes',
      '/schools/students'
    ];
    for(const ep of endpoints){
      const res = await fetch(`${API}${ep}`,{headers:{'Authorization':`Bearer ${token}`}});
      let txt = await res.text();
      try{ txt = JSON.parse(txt); } catch(e){}
      console.log(ep, res.status, txt && (typeof txt === 'object' ? JSON.stringify(txt).slice(0,300) : txt));
    }
  }catch(e){ console.error(e); }
})();
