import pool from './config/database.js';

async function debug() {
  try {
    // Verificar se tabela existe
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tabelas existentes:', tables.rows.map(x => x.table_name));
    
    // Verificar se student_profile_views existe
    const viewsTable = tables.rows.find(t => t.table_name === 'student_profile_views');
    if (!viewsTable) {
      console.log('\n⚠️ Tabela student_profile_views NÃO existe! Criando...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS student_profile_views (
          id SERIAL PRIMARY KEY,
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          viewed_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(student_id, company_id)
        )
      `);
      console.log('✅ Tabela criada!');
    } else {
      console.log('\n✅ Tabela student_profile_views existe');
      
      // Verificar colunas
      const cols = await pool.query(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'student_profile_views'
      `);
      console.log('Colunas:', cols.rows);
    }
    
    // Verificar se users tem avatar
    const avatarCol = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar'
    `);
    console.log('\nColuna avatar em users:', avatarCol.rows.length > 0 ? 'SIM' : 'NÃO');
    
  } catch (e) {
    console.error('Erro:', e.message);
  }
  process.exit();
}

debug();
