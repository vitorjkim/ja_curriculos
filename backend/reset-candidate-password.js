import pool from './config/database.js';
import bcrypt from 'bcryptjs';

async function resetCandidatePassword() {
    try {
        console.log('🔑 Redefinindo senha do candidato...');
        
        const email = 'candidato@teste.com';
        const newPassword = '123456';
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const updateQuery = `
            UPDATE users 
            SET password = $1 
            WHERE email = $2 AND type = 'candidate'
            RETURNING id, email, name
        `;
        
        const updateResult = await pool.query(updateQuery, [hashedPassword, email]);
        
        if (updateResult.rows.length > 0) {
            const user = updateResult.rows[0];
            console.log(`\n✅ Senha redefinida para: ${user.name} (${user.email})`);
            console.log(`🔑 Nova senha: ${newPassword}`);
        } else {
            console.log(`\n❌ Candidato não encontrado: ${email}`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

resetCandidatePassword();
