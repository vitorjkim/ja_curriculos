import fetch from 'node-fetch';
const API='https://jacurriculos-production.up.railway.app/api';
const email='escola.alpha@example.com';
const password='escola123';
(async()=>{
  try{
    const login=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const lj=await login.json();
    console.log('LOGIN',login.status,lj.message||lj);
    if(!login.ok) return;
    const token=lj.token;
    const res=await fetch(`${API}/schools/classes`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({name:'Turma Teste Produção', description:'Criada por teste via script'})});
    const text=await res.text();
    try{ console.log('CREATE CLASS',res.status, JSON.parse(text)); }catch(e){ console.log('CREATE CLASS',res.status, text); }
  }catch(e){ console.error('Err',e); }
})();
