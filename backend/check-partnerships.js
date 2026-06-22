import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkPartnerships() {
  try {
    console.log('Verificando parcerias...\n');

    // Listar todas as parcerias
    const allPartnerships = await pool.query(`
      SELECT 
        p.*,
        s.name as school_name,
        c.name as company_name,
        c.company_name as company_business_name
      FROM partnerships p
      LEFT JOIN users s ON s.id = p.school_id
      LEFT JOIN users c ON c.id = p.company_id
      ORDER BY p.created_at DESC
    `);

    console.log(`Total de parcerias: ${allPartnerships.rows.length}\n`);

    if (allPartnerships.rows.length > 0) {
      console.log('Parcerias encontradas:');
      allPartnerships.rows.forEach((p, idx) => {
        console.log(`\n${idx + 1}. ID: ${p.id}`);
        console.log(`   Escola: ${p.school_name} (${p.school_id})`);
        console.log(`   Empresa: ${p.company_business_name || p.company_name} (${p.company_id})`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Solicitada por: ${p.requested_by}`);
        console.log(`   Criada em: ${p.created_at}`);
      });
    } else {
      console.log('❌ Nenhuma parceria encontrada no banco de dados');
    }

    // Verificar usuários do tipo escola
    const schools = await pool.query(`SELECT id, name, email, type FROM users WHERE type='school' LIMIT 5`);
    console.log(`\n\nTotal de escolas: ${schools.rows.length}`);
    schools.rows.forEach(s => {
      console.log(`- ${s.name} (${s.id}) - ${s.email}`);
    });

    // Verificar usuários do tipo empresa
    const companies = await pool.query(`SELECT id, name, company_name, email, type FROM users WHERE type='company' LIMIT 5`);
    console.log(`\n\nTotal de empresas: ${companies.rows.length}`);
    companies.rows.forEach(c => {
      console.log(`- ${c.company_name || c.name} (${c.id}) - ${c.email}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkPartnerships();
