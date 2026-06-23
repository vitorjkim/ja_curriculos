import fetch from 'node-fetch';

const API = 'https://jacurriculos-production.up.railway.app/api';
const email = 'escola.alpha@example.com';
const password = 'escola123';

async function run() {
  try {
    console.log('Logging in', email);
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN STATUS', loginRes.status, 'BODY', JSON.stringify(loginJson));
    if (!loginRes.ok) return;
    const token = loginJson.token;

    const res = await fetch(`${API}/schools/classes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const body = await res.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch(e) { parsed = body; }
    console.log('CLASSES STATUS', res.status, 'BODY', parsed);
  } catch(e) {
    console.error('Test error:', e);
  }
}

run();
