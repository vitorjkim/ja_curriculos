// Debug do frontend - testar login
console.log('🧪 Testando login do frontend...');

// Simular o que o contexto está fazendo
import ApiService from './src/lib/api.js';

const testFrontendLogin = async () => {
  try {
    console.log('📧 Email:', 'admin@curriculoja.com');
    console.log('🔑 Password:', 'admin123');
    
    const response = await ApiService.login('admin@curriculoja.com', 'admin123');
    
    console.log('📦 Resposta completa:', response);
    console.log('👤 User:', response.user);
    console.log('🎫 Token:', response.token ? 'Presente' : 'Ausente');
    console.log('🔄 RefreshToken:', response.refreshToken ? 'Presente' : 'Ausente');
    
    if (response.user && response.token) {
      console.log('✅ Login frontend funcionou!');
    } else {
      console.log('❌ Login frontend falhou - dados incompletos');
    }
    
  } catch (error) {
    console.error('💥 Erro no login frontend:', error);
  }
};

testFrontendLogin();
