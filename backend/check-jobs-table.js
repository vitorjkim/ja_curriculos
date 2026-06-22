import pool from './config/database.js';

async function checkJobsTable() {
    try {
        console.log('🔍 Verificando estrutura da tabela jobs...');
        
        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'jobs'
            ORDER BY ordinal_position;
        `;
        
        const result = await pool.query(query);
        
        console.log('📋 Colunas da tabela jobs:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        // Mostrar algumas vagas como exemplo
        const jobsQuery = 'SELECT * FROM jobs LIMIT 3';
        const jobsResult = await pool.query(jobsQuery);
        
        console.log('\n📋 Vagas de exemplo:');
        jobsResult.rows.forEach(job => {
            console.log(`  - ${job.title} (ID: ${job.id})`);
            console.log(`    Company ID: ${job.company_id}`);
            console.log(`    Location: ${job.location}`);
            console.log(`    Active: ${job.active}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkJobsTable();
