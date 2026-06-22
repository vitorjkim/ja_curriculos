import pool from './config/database.js';

async function cleanupTestData() {
    try {
        console.log('🧹 Limpando dados de teste...');
        
        // Remover todas as vagas de teste
        const deleteJobsQuery = `DELETE FROM jobs WHERE id IN (
            '28f8c4a2-969f-4a10-be36-ec946077f76c',
            'd423ee27-d5fb-441e-bf9a-04719a71af00',
            'c02e45c4-da3f-459c-acf4-dcc0c6de58e3',
            '96d44b90-5105-4836-b24e-7c6b0c54dfba'
        )`;
        
        const result = await pool.query(deleteJobsQuery);
        console.log(`✅ ${result.rowCount} vagas removidas`);
        
        // Verificar se ainda há vagas
        const countQuery = 'SELECT COUNT(*) as total FROM jobs';
        const countResult = await pool.query(countQuery);
        console.log(`📋 Vagas restantes: ${countResult.rows[0].total}`);
        
        // Mostrar empresas restantes
        const companiesQuery = `
            SELECT id, email, company_name, name, type
            FROM users 
            WHERE type = 'company'
            ORDER BY created_at DESC
        `;
        
        const companiesResult = await pool.query(companiesQuery);
        
        console.log('\n🏢 Empresas cadastradas:');
        companiesResult.rows.forEach(company => {
            console.log(`  - ${company.company_name || company.name} (${company.email})`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

cleanupTestData();
