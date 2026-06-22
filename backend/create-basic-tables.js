import pool from './config/database.js';

const createBasicTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Criando tabelas básicas...');

    // Habilitar extensão UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ Extensão UUID habilitada');
    
    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        company_name VARCHAR(255),
        phone VARCHAR(20),
        cpf VARCHAR(14),
        cnpj VARCHAR(18),
        type VARCHAR(20) NOT NULL CHECK (type IN ('candidate', 'company', 'admin')),
        is_admin BOOLEAN DEFAULT FALSE,
        disabled BOOLEAN DEFAULT FALSE,
        profile_image VARCHAR(500),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela users criada');

    // Função para atualizar updated_at automaticamente
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função update_updated_at_column criada');

    // Trigger para atualizar updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger update_users_updated_at criado');

    console.log('✅ Tabelas básicas criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createBasicTables();
