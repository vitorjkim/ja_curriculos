const url = 'https://jacurriculos-production.up.railway.app/api/auth/register';

async function run() {
  try {
    const email = `testuser+${Date.now()}@example.com`;
    const body = {
      email,
      password: 'test123',
      type: 'candidate',
      name: 'Teste Usuário'
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    console.log('STATUS:', resp.status);
    console.log('BODY:', text);
  } catch (e) {
    console.error('Request failed:', e);
  }
}

run();
