// Script para normalizar valores de status legacy (ativo/inativo) -> active/inactive
import pool from '../config/database.js';

(async () => {
  try {
    console.log('🔧 Normalizando status de estudantes...');
    const before = await pool.query("SELECT status, COUNT(*) FROM students GROUP BY status ORDER BY 1");
    console.table(before.rows);

    const res1 = await pool.query("UPDATE students SET status = 'active', updated_at = NOW() WHERE LOWER(status) = 'ativo'");
    const res2 = await pool.query("UPDATE students SET status = 'inactive', updated_at = NOW() WHERE LOWER(status) = 'inativo'");
    // Forçar qualquer valor inválido restante para 'active'
    const res3 = await pool.query("UPDATE students SET status = 'active', updated_at = NOW() WHERE status NOT IN ('active','inactive','graduated','dropped')");

    const after = await pool.query("SELECT status, COUNT(*) FROM students GROUP BY status ORDER BY 1");
    console.log(`✅ Atualizados: ativo->active: ${res1.rowCount}, inativo->inactive: ${res2.rowCount}, outros inválidos->active: ${res3.rowCount}`);
    console.table(after.rows);
  } catch (e) {
    console.error('❌ Erro ao normalizar status:', e);
  } finally {
    await pool.end();
  }
})();
