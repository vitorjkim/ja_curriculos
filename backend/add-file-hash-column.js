import pool from './config/database.js';

async function addFileHashColumn() {
  try {
    console.log('🔧 Adicionando coluna file_hash à tabela resumes...');
    
    // Adicionar coluna file_hash
    await pool.query(`
      ALTER TABLE resumes 
      ADD COLUMN IF NOT EXISTS file_hash VARCHAR(32)
    `);
    console.log('✅ Coluna file_hash adicionada');
    
    // Criar índice para busca rápida
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resumes_user_hash 
      ON resumes(user_id, file_hash) 
      WHERE file_hash IS NOT NULL
    `);
    console.log('✅ Índice criado para user_id + file_hash');
    
    console.log('✅ Migração concluída com sucesso!');
    console.log('');
    console.log('ℹ️ Agora, quando um aluno fizer upload do mesmo currículo,');
    console.log('   o sistema vai detectar a duplicata e retornar o existente.');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
  }
  process.exit();
}

addFileHashColumn();
