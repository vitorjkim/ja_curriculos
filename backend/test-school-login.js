import axios from 'axios';

async function testSchoolLogin() {
  try {
    console.log('🔐 Testando login da escola...\n');

    const loginData = {
      email: 'escola@exemplo.com',
      password: 'escola123'
    };

    console.log('📧 Fazendo login com:', loginData.email);

    const response = await axios.post('http://localhost:3001/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log('✅ Login realizado com sucesso!\n');
      
      const { user, token } = response.data;
      
      console.log('👤 Dados do usuário:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Tipo: ${user.type}`);
      console.log(`   Nome da Escola: ${user.schoolName}`);
      console.log(`   Tipo da Escola: ${user.schoolType}`);
      console.log(`   Diretor: ${user.schoolDirector}`);
      console.log(`   Telefone: ${user.schoolContactPhone}`);
      console.log(`   Cidade: ${user.schoolCity}`);
      console.log(`   Estado: ${user.schoolState}`);
      
      console.log('\n🔑 Token JWT:');
      console.log(`   ${token.substring(0, 50)}...`);
      
      // Verificar se o tipo está correto
      if (user.type === 'school') {
        console.log('\n✅ SUCESSO: Tipo de usuário está correto (school)');
        
        // Testar uma rota específica de escola
        console.log('\n🧪 Testando rota específica de escola...');
        try {
          const schoolStatsResponse = await axios.get('http://localhost:3001/api/schools/dashboard/stats', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ Rota de escola funcionando!');
          console.log('📊 Estatísticas:', schoolStatsResponse.data.stats);
          
        } catch (schoolError) {
          console.log('❌ Erro ao acessar rota de escola:', schoolError.response?.status, schoolError.response?.data?.message);
        }
        
      } else {
        console.log(`\n❌ PROBLEMA: Tipo incorreto (${user.type}) - deveria ser 'school'`);
      }
      
    } else {
      console.log('❌ Falha no login:', response.status);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor não está rodando. Inicie o servidor com: node server.js');
    } else {
      console.log('❌ Erro no login:');
      console.log('   Status:', error.response?.status);
      console.log('   Mensagem:', error.response?.data?.error || error.message);
    }
  }
}

testSchoolLogin();
