const axios = require('axios');

async function testSchoolAPI() {
  console.log('🧪 Testando API de listagem de usuários escola...\n');
  
  try {
    // Primeiro fazer login como admin
    console.log('🔐 Fazendo login como admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@curriculoja.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');
    
    // Testar listagem completa de usuários
    console.log('\n📋 Testando listagem completa de usuários...');
    const allUsersResponse = await axios.get('http://localhost:3001/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const stats = allUsersResponse.data.stats;
    console.log(`📊 Estatísticas recebidas:`);
    console.log(`   Total: ${stats.totalUsers}`);
    console.log(`   Candidatos: ${stats.candidates}`);
    console.log(`   Empresas: ${stats.companies}`);
    console.log(`   Escolas: ${stats.schools || 'N/A'}`);
    console.log(`   Admins: ${stats.admins}`);
    
    // Filtrar apenas escolas
    console.log('\n🏫 Testando filtro de escolas...');
    const schoolResponse = await axios.get('http://localhost:3001/api/users?type=school', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const schools = schoolResponse.data.users;
    console.log(`✅ Escolas encontradas: ${schools.length}\n`);
    
    schools.forEach((school, index) => {
      console.log(`${index + 1}. Escola:`);
      console.log(`   Email: ${school.email}`);
      console.log(`   Tipo: ${school.type}`);
      console.log(`   Nome: ${school.schoolName || 'N/A'}`);
      console.log(`   Tipo Escola: ${school.schoolType || 'N/A'}`);
      console.log(`   Cidade: ${school.schoolCity || 'N/A'}`);
      console.log(`   Estado: ${school.schoolState || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testSchoolAPI();
