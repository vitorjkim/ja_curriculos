import pool from './config/database.js';

async function debugJobs() {
    try {
        console.log('🔍 Verificando usuários e suas vagas...');
        
        // Buscar todas as empresas e suas vagas
        const companiesQuery = `
            SELECT 
                u.id, 
                u.email, 
                u.company_name, 
                u.name,
                u.created_at::timestamp,
                COUNT(j.id) as total_vagas
            FROM users u 
            LEFT JOIN jobs j ON u.id = j.company_id 
            WHERE u.type = 'company' 
            GROUP BY u.id, u.email, u.company_name, u.name, u.created_at
            ORDER BY u.created_at DESC
        `;
        
        const companiesResult = await pool.query(companiesQuery);
        
        console.log('\n🏢 Empresas cadastradas:');
        for (const company of companiesResult.rows) {
            console.log(`\n📋 Empresa: ${company.company_name || company.name}`);
            console.log(`   📧 Email: ${company.email}`);
            console.log(`   🆔 ID: ${company.id}`);
            console.log(`   📅 Criada em: ${company.created_at}`);
            console.log(`   💼 Total de vagas: ${company.total_vagas}`);
            
            // Buscar vagas específicas desta empresa
            const jobsQuery = `
                SELECT id, title, description, location, work_type, is_active, created_at::timestamp
                FROM jobs 
                WHERE company_id = $1
                ORDER BY created_at DESC
            `;
            
            const jobsResult = await pool.query(jobsQuery, [company.id]);
            
            if (jobsResult.rows.length > 0) {
                console.log('   📝 Vagas:');
                jobsResult.rows.forEach((job, index) => {
                    console.log(`     ${index + 1}. ${job.title}`);
                    console.log(`        📍 ${job.location} - ${job.work_type}`);
                    console.log(`        📊 Ativa: ${job.is_active}`);
                    console.log(`        📅 Criada: ${job.created_at}`);
                    console.log(`        🆔 ID: ${job.id}`);
                });
            } else {
                console.log('   ❌ Nenhuma vaga encontrada');
            }
        }
        
        // Verificar se há vagas órfãs (sem empresa)
        const orphanJobsQuery = `
            SELECT j.*, u.company_name 
            FROM jobs j 
            LEFT JOIN users u ON j.company_id = u.id 
            WHERE u.id IS NULL
        `;
        
        const orphanResult = await pool.query(orphanJobsQuery);
        
        if (orphanResult.rows.length > 0) {
            console.log('\n⚠️  Vagas órfãs (sem empresa):');
            orphanResult.rows.forEach(job => {
                console.log(`  - ${job.title} (ID: ${job.id})`);
            });
        }
        
        console.log('\n✅ Verificação concluída');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

debugJobs();
