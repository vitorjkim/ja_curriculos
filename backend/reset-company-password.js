import pool from './config/database.js';
import bcrypt from 'bcryptjs';

async function updateCompanyPassword() {
    try {
        console.log('🔑 Redefinindo senha da empresa...');
        
        // Mostrar empresas disponíveis
        const companiesQuery = `
            SELECT id, email, company_name, name 
            FROM users 
            WHERE type = 'company' 
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(companiesQuery);
        
        console.log('\n🏢 Empresas disponíveis:');
        result.rows.forEach((company, index) => {
            console.log(`${index + 1}. ${company.company_name || company.name} (${company.email})`);
        });
        
        // Redefinir senha da empresa2@gmail.com
        const email = 'empresa2@gmail.com';
        const newPassword = '123456';
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const updateQuery = `
            UPDATE users 
            SET password = $1 
            WHERE email = $2 AND type = 'company'
            RETURNING id, email, company_name, name
        `;
        
        const updateResult = await pool.query(updateQuery, [hashedPassword, email]);
        
        if (updateResult.rows.length > 0) {
            const user = updateResult.rows[0];
            console.log(`\n✅ Senha redefinida para: ${user.company_name || user.name} (${user.email})`);
            console.log(`🔑 Nova senha: ${newPassword}`);
        } else {
            console.log(`\n❌ Empresa não encontrada: ${email}`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

updateCompanyPassword();
