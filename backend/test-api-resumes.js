// Script para testar diretamente a API de currículos
const http = require('http');

function testResumesAPI() {
  console.log('🧪 Testando API de currículos...');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM0ZTRkMzcyLTY2ODAtNDUwYy1hOGNiLWNiZTE0YzU1MGRiZCIsImVtYWlsIjoidml0b3IuY2FuZGlkYXRvQHRlc3RlLmNvbSIsInR5cGUiOiJjYW5kaWRhdGUiLCJpYXQiOjE3MzQ5ODM1NzQsImV4cCI6MTczNTA2OTk3NH0.Gha2RDhCFH7uoAZh8bSPBFEwPdNGJOZtFWTDEflVnqQ';
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/resumes',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log('📡 Status da resposta:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📡 Dados recebidos:', data);
      try {
        const parsedData = JSON.parse(data);
        console.log('✅ JSON parseado:', JSON.stringify(parsedData, null, 2));
        console.log('📊 Estrutura:', {
          success: parsedData.success,
          hasResumes: !!parsedData.resumes,
          resumesCount: Array.isArray(parsedData.resumes) ? parsedData.resumes.length : 'não é array',
          isArray: Array.isArray(parsedData)
        });
      } catch (error) {
        console.error('❌ Erro ao parsear JSON:', error.message);
        console.log('🔍 Dados brutos:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error);
  });
  
  req.end();
}

testResumesAPI();
