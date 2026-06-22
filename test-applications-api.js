// Testar API de candidaturas após correção final
const API_BASE = 'http://localhost:3001/api';

async function testApplicationsAPI() {
  try {
    console.log('🔐 Fazendo login...');
    
    // Login
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'vitor@gmail.com',
        password: 'password'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login realizado:', loginData.message);
    
    const token = loginData.token;
    
    // Testar candidaturas
    console.log('\n📋 Testando endpoint de candidaturas...');
    const applicationsResponse = await fetch(`${API_BASE}/applications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (applicationsResponse.ok) {
      const applicationsData = await applicationsResponse.json();
      console.log('✅ Candidaturas carregadas com sucesso!');
      console.log('📊 Total de candidaturas:', applicationsData.applications?.length || 0);
      
      if (applicationsData.applications && applicationsData.applications.length > 0) {
        console.log('\n📄 Primeira candidatura:');
        const firstApp = applicationsData.applications[0];
        console.log('- Job:', firstApp.job_title);
        console.log('- Empresa:', firstApp.company_name);
        console.log('- Status:', firstApp.status);
        console.log('- Data:', new Date(firstApp.applied_at).toLocaleDateString('pt-BR'));
      }
      
    } else {
      const errorData = await applicationsResponse.json();
      console.error('❌ Erro ao carregar candidaturas:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testApplicationsAPI();
