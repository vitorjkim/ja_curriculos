import pool from '../config/database.js';
import readline from 'readline';

// Script para limpar CNPJs duplicados

const cleanupDuplicateCNPJ = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Verificando CNPJs duplicados...');

    // Buscar CNPJs duplicados
    const duplicates = await client.query(`
      SELECT cnpj, array_agg(id) as user_ids, array_agg(email) as emails, COUNT(*) as count
      FROM users 
      WHERE cnpj IS NOT NULL 
      AND cnpj != '' 
      AND type = 'company'
      GROUP BY cnpj 
      HAVING COUNT(*) > 1
      ORDER BY cnpj
    `);

    if (duplicates.rows.length === 0) {
      console.log('✅ Nenhum CNPJ duplicado encontrado!');
      return;
    }

    console.log(`⚠️  Encontrados ${duplicates.rows.length} CNPJs duplicados:`);
    
    for (const duplicate of duplicates.rows) {
      console.log(`\n📋 CNPJ: ${duplicate.cnpj}`);
      console.log(`   ${duplicate.count} empresas encontradas:`);
      
      for (let i = 0; i < duplicate.user_ids.length; i++) {
        console.log(`   - ID: ${duplicate.user_ids[i]} | Email: ${duplicate.emails[i]}`);
      }
    }

    console.log('\n🔄 Para resolver automaticamente, manteremos apenas o primeiro registro de cada CNPJ...');
    
    // Confirmar se deve prosseguir
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Deseja continuar? (s/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'sim') {
      console.log('❌ Operação cancelada.');
      return;
    }

    // Proceder com a limpeza
    let cleanedCount = 0;
    
    for (const duplicate of duplicates.rows) {
      const userIds = duplicate.user_ids;
      const keepFirstId = userIds[0]; // Manter o primeiro
      const idsToDelete = userIds.slice(1); // Deletar os outros
      
      console.log(`\n🧹 Limpando CNPJ ${duplicate.cnpj}:`);
      console.log(`   Mantendo: ${keepFirstId}`);
      console.log(`   Removendo: ${idsToDelete.join(', ')}`);
      
      // Deletar registros duplicados
      for (const idToDelete of idsToDelete) {
        await client.query('DELETE FROM users WHERE id = $1', [idToDelete]);
        cleanedCount++;
        console.log(`   ✅ Removido usuário ${idToDelete}`);
      }
    }

    console.log(`\n🎉 Limpeza concluída! ${cleanedCount} registros duplicados foram removidos.`);
    console.log('✅ Agora você pode executar o script add-cnpj-unique-constraint.js');

  } catch (error) {
    console.error('❌ Erro ao limpar CNPJs duplicados:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

cleanupDuplicateCNPJ();
