import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'curriculoja', 
  user: 'postgres', 
  password: 'admin' 
});

async function test() {
  try {
    // Verificar estrutura da tabela
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'journey_responses'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Colunas da tabela journey_responses ===');
    console.table(cols.rows);
    
    // Verificar dados
    const data = await pool.query('SELECT * FROM journey_responses');
    console.log('\n=== Dados na tabela ===');
    console.log('Total de registros:', data.rowCount);
    if (data.rowCount > 0) {
      console.table(data.rows);
    }
    
    // Verificar um usuário candidato existente
    const users = await pool.query(`
      SELECT u.id, u.email, u.type, s.id as student_id, s.name 
      FROM users u 
      LEFT JOIN students s ON s.user_id = u.id 
      WHERE u.type = 'candidate' 
      LIMIT 5
    `);
    console.log('\n=== Usuários candidatos ===');
    console.table(users.rows);
    
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

test();
