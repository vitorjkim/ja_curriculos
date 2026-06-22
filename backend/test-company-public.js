import axios from 'axios';

async function testCompanyPublic() {
    const BASE_URL = 'http://localhost:3001/api';
    
    try {
        console.log('🔍 Testando endpoint público da empresa...');
        
        // Primeiro, vamos buscar todas as empresas para pegar um ID válido
        const usersResponse = await axios.get(`${BASE_URL}/users`);
        console.log('📋 Usuários encontrados:', usersResponse.data.length);
        
        // Filtrar apenas empresas
        const companies = usersResponse.data.filter(user => user.type === 'company');
        console.log('🏢 Empresas encontradas:', companies.length);
        
        if (companies.length === 0) {
            console.log('❌ Nenhuma empresa encontrada');
            return;
        }
        
        // Testar o endpoint público com a primeira empresa
        const company = companies[0];
        console.log(`\n🧪 Testando empresa: ${company.company_name || company.name} (ID: ${company.id})`);
        
        const companyResponse = await axios.get(`${BASE_URL}/users/company/${company.id}`);
        console.log('✅ Resposta da empresa:', {
            id: companyResponse.data.id,
            company_name: companyResponse.data.company_name,
            name: companyResponse.data.name,
            email: companyResponse.data.email
        });
        
        // Testar busca de vagas da empresa
        console.log('\n🔍 Testando vagas da empresa...');
        const jobsResponse = await axios.get(`${BASE_URL}/jobs?company=${company.id}`);
        console.log('📋 Vagas encontradas:', jobsResponse.data.jobs?.length || 0);
        
        if (jobsResponse.data.jobs && jobsResponse.data.jobs.length > 0) {
            jobsResponse.data.jobs.forEach(job => {
                console.log(`  - ${job.title} (${job.location}) - ${job.type}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
    }
}

testCompanyPublic();
