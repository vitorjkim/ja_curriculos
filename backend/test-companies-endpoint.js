import pool from './config/database.js';

async function testCompaniesEndpoint() {
    try {
        console.log('🏢 Testando query do endpoint de empresas...');
        
        const query = `
          SELECT 
            u.id,
            u.company_name,
            u.bio as company_description,
            u.phone,
            COALESCE(COUNT(j.id), 0) as jobs_count
          FROM users u
          LEFT JOIN jobs j ON u.id = j.company_id AND j.is_active = TRUE
          WHERE u.type = 'company' 
            AND (u.disabled = FALSE OR u.disabled IS NULL)
          GROUP BY u.id, u.company_name, u.bio, u.phone
          ORDER BY jobs_count DESC, u.company_name ASC
        `;

        const result = await pool.query(query);
        
        console.log(`📋 Empresas encontradas: ${result.rows.length}`);
        
        result.rows.forEach(company => {
            console.log(`\n🏢 ${company.company_name || 'Nome não definido'}`);
            console.log(`   🆔 ID: ${company.id}`);
            console.log(`   📞 Telefone: ${company.phone || 'Não informado'}`);
            console.log(`   💼 Vagas ativas: ${company.jobs_count}`);
            console.log(`   📝 Bio: ${company.company_description || 'Não informado'}`);
        });
        
        console.log(`\n📊 JSON Response:`);
        console.log(JSON.stringify({ companies: result.rows }, null, 2));
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.detail) {
            console.error('📝 Detalhe:', error.detail);
        }
    } finally {
        await pool.end();
    }
}

testCompaniesEndpoint();
