const loginUrl = 'https://jacurriculos-production.up.railway.app/api/auth/login';
const appsUrl = 'https://jacurriculos-production.up.railway.app/api/applications/company';

async function run(){
  try{
    const login = await fetch(loginUrl, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'empresa@exemplo.com', password:'empresa123'})});
    const loginBody = await login.text();
    console.log('LOGIN STATUS', login.status, 'BODY', loginBody);
    if(login.status!==200){ return; }
    const token = JSON.parse(loginBody).token;
    const apps = await fetch(appsUrl, {headers:{'Authorization':`Bearer ${token}`}});
    const appsBody = await apps.text();
    console.log('APPS STATUS', apps.status, 'BODY', appsBody);
  }catch(e){console.error('Request failed', e);}
}

run();
