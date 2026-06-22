import pool from './config/database.js';

async function testJobCreationWithValidation() {
    try {
        console.log('🧪 Testando validação de criação de vaga...');
        
        // Simular dados de um formulário de vaga
        const jobData = {
            title: 'Desenvolvedor Frontend',
            description: 'Vaga para desenvolvedor React',
            requirements: 'React, JavaScript, HTML, CSS',
            benefits: 'Vale refeição, plano de saúde',
            salary_min: 3000,
            salary_max: 5000,
            location: 'São Paulo, SP',
            work_type: 'hibrido',
            contract_type: 'clt',
            experience_level: 'junior'
        };
        
        console.log('📋 Dados da vaga:', jobData);
        
        // Verificar se todos os campos obrigatórios estão presentes
        const requiredFields = ['title', 'description', 'work_type', 'contract_type', 'experience_level'];
        const missingFields = requiredFields.filter(field => !jobData[field]);
        
        if (missingFields.length > 0) {
            console.log('❌ Campos obrigatórios ausentes:', missingFields);
        } else {
            console.log('✅ Todos os campos obrigatórios estão presentes');
        }
        
        // Verificar se os valores enum estão corretos
        const validWorkTypes = ['presencial', 'remoto', 'hibrido'];
        const validContractTypes = ['clt', 'pj', 'estagio', 'temporario'];
        const validExperienceLevels = ['junior', 'pleno', 'senior', 'estagio'];
        
        console.log('\n🔍 Validação de enums:');
        console.log(`work_type: ${jobData.work_type} ${validWorkTypes.includes(jobData.work_type) ? '✅' : '❌'}`);
        console.log(`contract_type: ${jobData.contract_type} ${validContractTypes.includes(jobData.contract_type) ? '✅' : '❌'}`);
        console.log(`experience_level: ${jobData.experience_level} ${validExperienceLevels.includes(jobData.experience_level) ? '✅' : '❌'}`);
        
        // Testar inserção no banco (simulado)
        const query = `
            INSERT INTO jobs (
                company_id, title, description, requirements, benefits,
                salary_min, salary_max, location, work_type, contract_type, experience_level,
                is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, title
        `;
        
        // Usar uma empresa existente para teste
        const companyId = 'dd4eade0-5839-4c18-9041-e710054398a4'; // empresa2@gmail.com
        
        const values = [
            companyId,
            jobData.title,
            jobData.description,
            jobData.requirements,
            jobData.benefits,
            jobData.salary_min,
            jobData.salary_max,
            jobData.location,
            jobData.work_type,
            jobData.contract_type,
            jobData.experience_level,
            true // is_active
        ];
        
        console.log('\n🧪 Testando inserção no banco...');
        const result = await pool.query(query, values);
        
        console.log('✅ Vaga criada com sucesso!');
        console.log(`📋 ID: ${result.rows[0].id}`);
        console.log(`📋 Título: ${result.rows[0].title}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.detail) {
            console.error('📝 Detalhe:', error.detail);
        }
    } finally {
        await pool.end();
    }
}

testJobCreationWithValidation();
