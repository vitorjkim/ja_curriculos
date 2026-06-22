// Test journey class stats - write to file
import fetch from 'node-fetch';
import fs from 'fs';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmMzdkNzYxLTkxYWYtNDczMC1iYWVlLTZiMzFjYTNkYTQxNiIsInVzZXJJZCI6ImVmMzdkNzYxLTkxYWYtNDczMC1iYWVlLTZiMzFjYTNkYTQxNiIsImVtYWlsIjoic2VuYWlAZ21haWwuY29tIiwidHlwZSI6InNjaG9vbCIsImlhdCI6MTc2ODQzNDE2NCwiZXhwIjoxNzY5MDM4OTY0fQ.42DCraq0MRmZTd9gNGw0M8DMbYAl1u_pNQFsad1lEKM';
const classId = '08f19152-9e95-493e-ac4a-2541516c6c62';

async function testJourneyStats() {
  let output = '';
  try {
    const response = await fetch(`http://localhost:3001/api/journey/class/${classId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    output += '=== JOURNEY STATS API RESPONSE ===\n';
    output += 'Status: ' + response.status + '\n';
    output += 'Data: ' + JSON.stringify(data, null, 2);
  } catch (error) {
    output += 'Error: ' + error.message;
  }
  fs.writeFileSync('journey-test-result.txt', output);
  console.log('Resultado salvo em journey-test-result.txt');
}

testJourneyStats();
