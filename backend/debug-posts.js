import pool from './config/database.js';

async function debugPosts() {
  try {
    console.log('=== DEBUG POSTS ===\n');
    
    // Lista todos os posts
    const posts = await pool.query(`
      SELECT 
        p.id as post_id,
        p.candidate_id, 
        u.type,
        u.name,
        u.company_name,
        u.school_name,
        COALESCE(NULLIF(u.name,''), NULLIF(u.company_name,''), NULLIF(u.school_name,''), u.email, 'Usuário') as resolved_name
      FROM student_posts p 
      JOIN users u ON u.id = p.candidate_id
    `);
    
    console.log('Posts no banco:');
    posts.rows.forEach((row, i) => {
      console.log(`${i+1}. Candidate ID: ${row.candidate_id}`);
      console.log(`   Tipo: ${row.type}`);
      console.log(`   Name: ${row.name || '(vazio)'}`);
      console.log(`   Company Name: ${row.company_name || '(vazio)'}`);
      console.log(`   School Name: ${row.school_name || '(vazio)'}`);
      console.log(`   RESOLVED: ${row.resolved_name}`);
      console.log('');
    });
    
    // Testa busca de posts de uma empresa específica
    const srsId = 'b5ca1695-0c4b-4794-a721-a3a32ebacf00';
    console.log('\n=== Teste busca posts da SRS ===');
    const srsPosts = await pool.query(`
      SELECT p.id, p.candidate_id FROM student_posts p WHERE p.candidate_id = $1
    `, [srsId]);
    console.log('Posts da SRS:', srsPosts.rows.length);
    
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e);
    process.exit(1);
  }
}

debugPosts();
