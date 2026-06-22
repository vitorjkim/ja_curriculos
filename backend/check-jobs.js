import pool from './config/database.js';

const checkJobs = async () => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT j.id, j.title, j.location, j.work_type, u.company_name 
      FROM jobs j 
      JOIN users u ON j.company_id = u.id 
      ORDER BY j.created_at DESC
    `);
    
    console.log('\n📋 Vagas no banco:');
    result.rows.forEach(job => {
      console.log(`- ${job.title} (${job.company_name}) - ${job.location} - ${job.work_type}`);
      console.log(`  ID: ${job.id}`);
    });
    
    console.log(`\n✅ Total: ${result.rows.length} vagas encontradas`);
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

checkJobs();
