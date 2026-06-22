// Teste da API de login
const testLogin = async () => {
  try {
    console.log('🧪 Testando API de login...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@curriculoja.com',
        password: 'admin123'
      })
    });
    
    console.log('📡 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📦 Resposta:', data);
    
    if (response.ok) {
      console.log('✅ Login funcionou!');
      console.log('👤 Usuário:', data.user?.name || data.user?.email);
    } else {
      console.log('❌ Erro no login:', data.error);
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error);
  }
};

testLogin();
