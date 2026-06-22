import pool from './config/database.js';

async function checkSchoolUser() {
  try {
    console.log('🔍 Verificando usuário da escola...\n');

    // Buscar o usuário escola
    const result = await pool.query(`
      SELECT id, email, name, type, school_name, school_type, created_at
      FROM users 
      WHERE email = 'escola@exemplo.com'
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('📋 Dados encontrados:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Tipo: ${user.type}`);
      console.log(`   Nome da Escola: ${user.school_name}`);
      console.log(`   Tipo da Escola: ${user.school_type}`);
      console.log(`   Criado em: ${user.created_at}`);
      
      if (user.type !== 'school') {
        console.log('\n❌ PROBLEMA: O tipo está incorreto!');
        console.log('🔧 Corrigindo tipo de usuário...');
        
        await pool.query(`
          UPDATE users 
          SET type = 'school' 
          WHERE email = 'escola@exemplo.com'
        `);
        
        console.log('✅ Tipo corrigido para "school"');
        
        // Verificar novamente
        const updatedResult = await pool.query(`
          SELECT type FROM users WHERE email = 'escola@exemplo.com'
        `);
        console.log(`📋 Novo tipo: ${updatedResult.rows[0].type}`);
      } else {
        console.log('\n✅ Tipo está correto: school');
      }
      
    } else {
      console.log('❌ Usuário escola não encontrado!');
      console.log('🔧 Criando usuário escola...');
      
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('escola123', 10);
      
      await pool.query(`
        INSERT INTO users (
          email, password, name, type, school_name, school_type, 
          school_address, school_city, school_state, school_cep,
          school_director, school_contact_phone, mec_code, school_level,
          created_at
        ) VALUES (
          'escola@exemplo.com', $1, 'Administrador Escola', 'school',
          'Instituto de Tecnologia Exemplo', 'tecnico',
          'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567',
          'Dr. João Silva', '(11) 1234-5678', 'MEC123456', 'tecnico_superior',
          NOW()
        )
      `, [hashedPassword]);
      
      console.log('✅ Usuário escola criado com sucesso!');
    }

    console.log('\n🎯 Credenciais para login:');
    console.log('   Email: escola@exemplo.com');
    console.log('   Senha: escola123');
    console.log('   Tipo: school');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkSchoolUser();
