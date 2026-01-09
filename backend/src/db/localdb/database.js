const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = process.env.LOCALDATABASE_PATH;

const db = new Database(dbPath);

// enable foreign key constraints
db.pragma('foreign_keys = ON');

// Função para criar as tabelas
function initializeDatabase() {
    // Criar tabela de usuários (exemplo)
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

initializeDatabase();

module.exports = { db, uuidv4 };
