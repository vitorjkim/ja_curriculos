import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testJobCreation() {
    try {
        console.log('🧪 Testando criação de vaga...');
        
        // 1. Fazer login com uma empresa
        console.log('\n1️⃣ Fazendo login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'empresa2@gmail.com',
            password: '123456'
        });
        
        console.log('✅ Login realizado com sucesso');
        console.log('👤 Usuário:', loginResponse.data.user.company_name || loginResponse.data.user.name);
        
        const token = loginResponse.data.token;
        
        // 2. Criar uma vaga
        console.log('\n2️⃣ Criando vaga...');
        const jobData = {
            title: 'Vaga de Teste',
            description: 'Esta é uma vaga criada para testar o sistema',
            requirements: 'Conhecimento em testes',
            benefits: 'Vale teste',
            location: 'São Paulo, SP',
            work_type: 'remoto',
            contract_type: 'clt',
            experience_level: 'junior'
        };
        
        const jobResponse = await axios.post(`${BASE_URL}/jobs`, jobData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('✅ Vaga criada com sucesso!');
        console.log('📋 Vaga criada:', {
            id: jobResponse.data.job.id,
            title: jobResponse.data.job.title,
            company_id: jobResponse.data.job.company_id,
            location: jobResponse.data.job.location
        });
        
        // 3. Verificar se apareceu na listagem
        console.log('\n3️⃣ Verificando na listagem...');
        const listResponse = await axios.get(`${BASE_URL}/jobs`);
        
        const createdJob = listResponse.data.jobs.find(job => job.id === jobResponse.data.job.id);
        
        if (createdJob) {
            console.log('✅ Vaga apareceu na listagem!');
        } else {
            console.log('❌ Vaga NÃO apareceu na listagem');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('💡 Dica: Verifique se as credenciais estão corretas');
        }
    }
}

testJobCreation();
