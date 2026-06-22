import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001/api';

async function testUserUpdate() {
    try {
        console.log('🧪 Testando atualização de usuário...\n');

        // 1. Fazer login para obter token
        console.log('1. Fazendo login...');
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@curriculoja.com',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            const loginData = await loginResponse.json();
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText} - ${JSON.stringify(loginData)}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login realizado com sucesso');

        // 2. Listar usuários para pegar um ID
        console.log('\n2. Listando usuários...');
        const usersResponse = await fetch(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!usersResponse.ok) {
            const errorData = await usersResponse.json();
            throw new Error(`Users list failed: ${usersResponse.status} ${usersResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        const usersData = await usersResponse.json();
        console.log('Resposta da API users:', usersData);
        
        // Verificar se a resposta tem o formato esperado
        const users = usersData.data || usersData.users || usersData;
        const usersList = Array.isArray(users) ? users : [];
        
        console.log(`✅ ${usersList.length} usuários encontrados`);

        if (usersList.length === 0) {
            console.log('❌ Nenhum usuário encontrado para testar');
            return;
        }

        // 3. Pegar um usuário para testar (não admin)
        let testUser = usersList.find(u => u.type !== 'admin');
        
        if (!testUser) {
            console.log('❌ Nenhum usuário não-admin encontrado para testar');
            console.log('Usuários disponíveis:', usersList.map(u => ({ id: u.id, email: u.email, type: u.type })));
            // Usar o admin mesmo para testar
            const adminUser = usersList.find(u => u.type === 'admin');
            if (adminUser) {
                console.log('ℹ️  Usando usuário admin para teste');
                testUser = adminUser;
            } else {
                return;
            }
        }

        console.log(`\n3. Usuário selecionado para teste:`, {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
            type: testUser.type
        });

        // 4. Tentar atualizar o usuário
        console.log('\n4. Atualizando usuário...');
        
        const updateData = {
            email: testUser.email,
            phone: testUser.phone || '(11) 99999-9999', // Adicionar telefone se não existe
            type: testUser.type
        };

        // Adicionar campos específicos por tipo
        if (testUser.type === 'candidate' || testUser.type === 'admin') {
            updateData.name = (testUser.name || 'Nome Teste') + ' - Editado';
        }

        if (testUser.type === 'company') {
            updateData.company_name = (testUser.company_name || 'Empresa Teste') + ' - Editada';
        }

        console.log('Dados para atualização:', updateData);

        const updateResponse = await fetch(`${API_URL}/users/${testUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`Update failed: ${updateResponse.status} ${updateResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        const updateResult = await updateResponse.json();
        console.log('✅ Usuário atualizado com sucesso!');
        console.log('Usuário atualizado:', updateResult.user);

        // 5. Verificar se a atualização foi persistida
        console.log('\n5. Verificando atualização...');
        const verifyResponse = await fetch(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const verifyData = await verifyResponse.json();
        const updatedUsersList = verifyData.data || verifyData.users || verifyData;
        const updatedUser = (Array.isArray(updatedUsersList) ? updatedUsersList : []).find(u => u.id === testUser.id);
        
        if (updatedUser) {
            console.log('✅ Atualização verificada no banco de dados:');
            console.log('Usuário atual:', {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                company_name: updatedUser.company_name,
                phone: updatedUser.phone,
                type: updatedUser.type
            });
        } else {
            console.log('❌ Usuário não encontrado após atualização');
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar o teste
testUserUpdate();
