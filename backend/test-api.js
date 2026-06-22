const testAPI = async () => {
  try {
    console.log('🧪 Testando API de vagas...');
    
    const response = await fetch('http://localhost:3001/api/jobs');
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sucesso! Vagas encontradas:', data.jobs?.length || 0);
      if (data.jobs?.length > 0) {
        console.log('Primeira vaga:', data.jobs[0].title);
      }
    } else {
      const error = await response.text();
      console.log('❌ Erro na API:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
  }
};

testAPI();
