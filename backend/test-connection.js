import pool from './config/database.js';

const testConnection = async () => {
  try {
    console.log('🔌 Testando conexão com PostgreSQL...');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ Conexão bem-sucedida!');
    console.log('📅 Data/Hora:', result.rows[0].current_time);
    console.log('🗄️  Versão:', result.rows[0].pg_version);
    
    // Verificar se banco existe
    const dbCheck = await pool.query('SELECT current_database() as db_name');
    console.log('📂 Banco atual:', dbCheck.rows[0].db_name);
    
    await pool.end();
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('🔍 Detalhes:', error.stack);
  }
};

testConnection();
