import fetch from 'node-fetch';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmMzdkNzYxLTkxYWYtNDczMC1iYWVlLTZiMzFjYTNkYTQxNiIsInVzZXJJZCI6ImVmMzdkNzYxLTkxYWYtNDczMC1iYWVlLTZiMzFjYTNkYTQxNiIsImVtYWlsIjoic2VuYWlAZ21haWwuY29tIiwidHlwZSI6InNjaG9vbCIsImlhdCI6MTc2ODQzNDE2NCwiZXhwIjoxNzY5MDM4OTY0fQ.42DCraq0MRmZTd9gNGw0M8DMbYAl1u_pNQFsad1lEKM';
const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';

async function test() {
  try {
    const res = await fetch(`http://localhost:3001/api/journey/class/${classId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n=== Validação ===');
    console.log('total presente?', 'total' in data);
    console.log('total valor:', data.total);
    console.log('typeof total:', typeof data.total);
    console.log('total === 0?', data.total === 0);
    console.log('total > 0?', data.total > 0);
    
  } catch (error) {
    console.error('Erro:', error);
  }
  process.exit(0);
}

test();
