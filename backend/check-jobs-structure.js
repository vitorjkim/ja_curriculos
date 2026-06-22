import pool from './config/database.js';

async function checkJobsStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela jobs...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Colunas da tabela jobs:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n🔍 Verificando algumas vagas de exemplo...');
    const jobsResult = await pool.query(`
      SELECT id, title, company_id, created_at
      FROM jobs 
      LIMIT 5;
    `);
    
    console.log('📋 Vagas encontradas:');
    jobsResult.rows.forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.title}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Company ID: ${job.company_id}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    pool.end();
  }
}

checkJobsStructure();
