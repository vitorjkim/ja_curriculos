import pool from './config/database.js';

async function checkUsersTable() {
    try {
        console.log('🔍 Verificando estrutura da tabela users...');
        
        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `;
        
        const result = await pool.query(query);
        
        console.log('📋 Colunas da tabela users:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsersTable();
