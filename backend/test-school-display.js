const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'curriculo_ja',
  password: 'vitor',
  port: 5432,
});

async function testSchoolDisplay() {
  console.log('🔍 Testando exibição de usuários escola...\n');
  
  try {
    // Verificar usuários escola no banco
    const schoolUsersQuery = `
      SELECT 
        id, email, type, 
        school_name, school_type, school_cnpj,
        created_at
      FROM users 
      WHERE type = 'school'
      ORDER BY created_at DESC
    `;
    
    const schoolUsers = await pool.query(schoolUsersQuery);
    
    console.log(`📊 Usuários escola encontrados: ${schoolUsers.rows.length}\n`);
    
    if (schoolUsers.rows.length > 0) {
      schoolUsers.rows.forEach((user, index) => {
        console.log(`${index + 1}. Escola:`)
        console.log(`   Email: ${user.email}`);
        console.log(`   Tipo: ${user.type}`);
        console.log(`   Nome: ${user.school_name || 'N/A'}`);
        console.log(`   Tipo Escola: ${user.school_type || 'N/A'}`);
        console.log(`   CNPJ: ${user.school_cnpj || 'N/A'}`);
        console.log(`   Criado em: ${user.created_at}\n`);
      });
    } else {
      console.log('❌ Nenhum usuário escola encontrado!');
    }
    
    // Testar endpoint de listagem de usuários
    console.log('🌐 Testando endpoint API...');
    const axios = require('axios');
    
    try {
      const response = await axios.get('http://localhost:3001/api/users?type=school');
      console.log(`✅ API Response: ${response.data.users.length} escolas encontradas`);
      
      if (response.data.users.length > 0) {
        const escola = response.data.users[0];
        console.log(`📝 Primeira escola na API:`);
        console.log(`   Email: ${escola.email}`);
        console.log(`   Tipo: ${escola.type}`);
        console.log(`   Nome: ${escola.schoolName || escola.school_name || 'N/A'}`);
      }
    } catch (apiError) {
      console.log(`❌ Erro na API: ${apiError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testSchoolDisplay();
