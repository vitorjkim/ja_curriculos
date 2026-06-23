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
    const name = 'Turma Teste ' + Date.now();
    const res=await fetch(`${API}/schools/classes`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({name, description:'Criada por script de teste'})});
    const body = await res.json().catch(()=>null);
    console.log('CREATE CLASS',res.status, body);
  }catch(e){ console.error('Err',e); }
})();
