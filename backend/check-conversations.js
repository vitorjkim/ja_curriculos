import pool from './config/database.js';

async function checkConversations() {
  try {
    console.log('🔍 Verificando conversas no sistema...');
    
    // Verificar conversas
    const conversationsResult = await pool.query(`
      SELECT * FROM conversations ORDER BY created_at DESC;
    `);
    
    console.log(`📋 Conversas encontradas: ${conversationsResult.rows.length}`);
    
    if (conversationsResult.rows.length > 0) {
      conversationsResult.rows.forEach((conv, index) => {
        console.log(`\n${index + 1}. Conversa ID: ${conv.id}`);
        console.log(`   Candidato ID: ${conv.candidate_id}`);
        console.log(`   Empresa ID: ${conv.company_id}`);
        console.log(`   Criado em: ${conv.created_at}`);
      });
    } else {
      console.log('❌ Nenhuma conversa encontrada.');
    }
    
    // Verificar company_follows
    const followsResult = await pool.query(`
      SELECT * FROM company_follows ORDER BY created_at DESC;
    `);
    
    console.log(`\n📋 Follows encontrados: ${followsResult.rows.length}`);
    
    if (followsResult.rows.length > 0) {
      followsResult.rows.forEach((follow, index) => {
        console.log(`\n${index + 1}. Follow ID: ${follow.id}`);
        console.log(`   Candidato ID: ${follow.candidate_id}`);
        console.log(`   Empresa ID: ${follow.company_id}`);
        console.log(`   Criado em: ${follow.created_at}`);
      });
    } else {
      console.log('❌ Nenhum follow encontrado.');
    }
    
    // Verificar candidatos
    const candidatesResult = await pool.query(`
      SELECT id, email, name FROM users WHERE type = 'candidate';
    `);
    
    console.log(`\n📋 Candidatos encontrados: ${candidatesResult.rows.length}`);
    
    candidatesResult.rows.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.name} (${candidate.email}) - ID: ${candidate.id}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    pool.end();
  }
}

checkConversations();
