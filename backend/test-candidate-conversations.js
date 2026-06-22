import axios from 'axios';

async function testCandidateConversations() {
  try {
    console.log('🔍 Fazendo login como candidato...');
    
    // Login do candidato
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'joaquim@gmail.com',
      password: '123456'
    });
    
    console.log('✅ Login realizado:', loginResponse.data.user?.name);
    
    const token = loginResponse.data.token;
    
    // Buscar conversas do candidato
    console.log('\n🔍 Buscando conversas do candidato...');
    const conversationsResponse = await axios.get('http://localhost:3001/api/chat/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const conversations = conversationsResponse.data;
    console.log('✅ Conversas encontradas:', conversations.length);
    
    conversations.forEach((conv, index) => {
      console.log(`\n${index + 1}. ${conv.contactName}`);
      console.log(`   ID: ${conv.id}`);
      console.log(`   Email: ${conv.contactEmail}`);
      console.log(`   Telefone: ${conv.contactPhone || 'NULL'}`);
      console.log(`   Última mensagem: ${conv.lastMessage || 'Nenhuma'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📋 Resposta:', error.response.data);
    }
  }
}

testCandidateConversations();
