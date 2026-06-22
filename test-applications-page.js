// Teste rápido da página Applications
console.log('🧪 Testando página Applications...');

// Simular login do usuário vitor
const loginData = {
  email: 'vitor@email.com',
  password: 'senha123'
};

fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(loginData)
})
.then(response => response.json())
.then(data => {
  if (data.success && data.token) {
    console.log('✅ Login realizado com sucesso');
    
    // Testar API de candidaturas
    return fetch('http://localhost:3001/api/applications', {
      headers: {
        'Authorization': `Bearer ${data.token}`
      }
    });
  } else {
    throw new Error('Falha no login');
  }
})
.then(response => response.json())
.then(data => {
  console.log('📋 Candidaturas encontradas:', data);
  console.log('📊 Total de candidaturas:', data.applications?.length || 0);
  
  if (data.applications && data.applications.length > 0) {
    console.log('✅ API de candidaturas funcionando!');
    console.log('🎯 Primeira candidatura:', data.applications[0]);
  } else {
    console.log('ℹ️ Nenhuma candidatura encontrada para este usuário');
  }
})
.catch(error => {
  console.error('❌ Erro no teste:', error);
});
