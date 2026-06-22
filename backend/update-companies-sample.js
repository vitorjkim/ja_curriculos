import pool from './config/database.js';

async function updateCompaniesWithSampleData() {
  try {
    console.log('🔧 Atualizando empresas com dados de exemplo...');
    
    const updates = [
      {
        id: 'aec139e6-8b98-48f3-b24f-ed6ce4b4eea4',
        bio: 'Empresa líder em soluções tecnológicas e inovação digital.',
        location: 'Ribeirão Preto, SP'
      },
      {
        id: '4780d0f7-27a4-4435-9be0-db2c039253c4', 
        bio: 'Especializada em serviços de manutenção e reparo.',
        location: 'São Carlos, SP'
      },
      {
        id: 'b29c78f4-1d66-40d3-bc9f-baeadc885e73',
        bio: 'Empresa focada em soluções corporativas e consultoria.',
        location: 'São Paulo, SP'
      },
      {
        id: '65d60d68-ea03-47d6-ae87-651b57d4b010',
        bio: 'Tecnologia e desenvolvimento de software personalizado.',
        location: 'Campinas, SP'
      }
    ];
    
    for (const update of updates) {
      await pool.query(
        'UPDATE users SET bio = $1, location = $2, updated_at = NOW() WHERE id = $3',
        [update.bio, update.location, update.id]
      );
      console.log(`✅ Empresa ${update.id} atualizada`);
    }
    
    console.log('🎉 Todas as empresas foram atualizadas com dados de exemplo!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar empresas:', error);
  } finally {
    pool.end();
  }
}

updateCompaniesWithSampleData();
