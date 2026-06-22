async function testAPI() {
  try {
    // Login
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'senai@gmail.com', password: 'senha123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    console.log('✅ Login realizado com sucesso\n');
    
    // Testar applications
    const appsRes = await fetch('http://localhost:3001/api/schools/employability/applications?limit=3', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const appsData = await appsRes.json();
    
    console.log('📋 Candidaturas Enviadas:');
    console.log(JSON.stringify(appsData.rows, null, 2));
    console.log('\n🔍 Primeiro registro tem profile_image?', appsData.rows[0]?.profile_image ? 'SIM ✅' : 'NÃO ❌');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAPI();
