const url = 'https://jacurriculos-production.up.railway.app/api/auth/login';

async function run() {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@curriculoja.com', password: 'admin123' })
    });

    const text = await resp.text();
    console.log('STATUS:', resp.status);
    console.log('HEADERS:', Object.fromEntries(resp.headers.entries()));
    console.log('BODY:', text);
  } catch (e) {
    console.error('Request failed:', e);
    process.exitCode = 1;
  }
}

run();
