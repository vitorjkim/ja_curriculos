import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do banco SQLite
const dbPath = join(__dirname, '../data/curriculoja.db');

let db;

const initSQLiteDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('✅ Conectado ao SQLite');
    return db;
  } catch (error) {
    console.error('❌ Erro ao conectar SQLite:', error);
    throw error;
  }
};

export default initSQLiteDB;
