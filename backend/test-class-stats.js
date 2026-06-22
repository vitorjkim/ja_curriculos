import fetch from 'node-fetch';

const CLASS_ID = '08f19152-9e95-493e-ac4a-2541516c6c62';
const API_URL = `http://localhost:3001/api/schools/classes/${CLASS_ID}/stats`;

// Você precisa de um token válido de escola para testar
// Pegue do localStorage do navegador (key: 'token') ou use credenciais
const TOKEN = process.env.SCHOOL_TOKEN || 'YOUR_SCHOOL_TOKEN_HERE';

async function testClassStats() {
  console.log('🧪 Testando endpoint de stats da turma...');
  console.log('URL:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Sucesso!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Erro:', data.message);
      console.log('Resposta completa:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
  }
}

testClassStats();
