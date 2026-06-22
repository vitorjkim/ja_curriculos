// Script para testar no console do browser
// Teste 1: Verificar autenticação
console.log('🔍 User logado:', localStorage.getItem('curriculoja_token'));

// Teste 2: Fazer requisição manual para currículo
const testResumeAPI = async () => {
  const token = localStorage.getItem('curriculoja_token');
  const resumeId = 'a2d33530-8e66-4a0c-bf21-d990be0433a9';
  
  console.log('🔍 Testando API de currículo...');
  console.log('Token:', token ? 'Presente' : 'Ausente');
  console.log('Resume ID:', resumeId);
  
  try {
    const response = await fetch(`http://localhost:3001/api/resumes/${resumeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Resposta:', data);
    
    if (response.ok) {
      console.log('✅ Sucesso!');
      console.log('Personal Info:', data.personal_info);
    } else {
      console.log('❌ Erro:', data);
    }
  } catch (error) {
    console.error('❌ Erro de rede:', error);
  }
};

// Teste 3: Verificar localStorage
const testLocalStorage = () => {
  console.log('🔍 Testando localStorage...');
  const resumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
  console.log('Currículos no localStorage:', resumes);
  
  const applications = JSON.parse(localStorage.getItem('curriculoja_applications') || '[]');
  console.log('Applications no localStorage:', applications);
  
  const user = JSON.parse(localStorage.getItem('curriculoja_user') || 'null');
  console.log('User no localStorage:', user);
};

// Executar testes
testLocalStorage();
testResumeAPI();

console.log('📋 Execute testLocalStorage() e testResumeAPI() no console para testar');
