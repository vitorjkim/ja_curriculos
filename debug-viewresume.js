// Script de teste para executar no console do browser
console.log('🔍 === DEBUG VIEWRESUME ===');

// 1. Verificar se o usuário está logado
const token = localStorage.getItem('curriculoja_token');
const user = JSON.parse(localStorage.getItem('curriculoja_user') || 'null');

console.log('Token:', token ? 'Presente ✅' : 'Ausente ❌');
console.log('User:', user);

// 2. Testar requisição manual com o token
const testResumeAPI = async () => {
  const resumeId = 'a2d33530-8e66-4a0c-bf21-d990be0433a9';
  
  console.log('\n🔍 Testando API de currículo...');
  
  try {
    const response = await fetch(`http://localhost:3001/api/resumes/${resumeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status da resposta:', response.status);
    const data = await response.json();
    console.log('Resposta da API:', data);
    
    if (response.ok) {
      console.log('✅ Sucesso! Personal Info:', data.resume?.personal_info);
    } else {
      console.log('❌ Erro na API:', data);
    }
  } catch (error) {
    console.error('❌ Erro de rede:', error);
  }
};

// 3. Verificar se a página atual é ViewResume
const currentPath = window.location.pathname;
console.log('Caminho atual:', currentPath);

if (currentPath.includes('/resume/')) {
  console.log('📄 Você está na página ViewResume');
  
  // Executar teste da API
  testResumeAPI();
} else {
  console.log('📋 Você não está na página ViewResume. Navegue para /resume/a2d33530-8e66-4a0c-bf21-d990be0433a9');
}

// Instruções
console.log(`
📋 INSTRUÇÕES:
1. Copie este código completo
2. Abra o Developer Tools (F12)  
3. Vá na aba Console
4. Cole e execute o código
5. Se não estiver na página ViewResume, navegue para ela primeiro
6. Verifique os resultados dos testes
`);
