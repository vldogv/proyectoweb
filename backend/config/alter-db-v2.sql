-- alter-db-v2.sql
-- Ejecutar sobre natureza_db para agregar: reset de contraseña y sistema de tickets.

USE natureza_db;

-- ─── Tokens de recuperación de contraseña ────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NOT NULL,
  token     VARCHAR(255) NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  used      TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ─── Tickets de soporte ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NULL,
  userEmail VARCHAR(255) NOT NULL,
  userName  VARCHAR(255) NOT NULL,
  subject   VARCHAR(255) NOT NULL,
  message   TEXT NOT NULL,
  status    VARCHAR(50) NOT NULL DEFAULT 'open',
  priority  VARCHAR(50) NOT NULL DEFAULT 'normal',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ─── Respuestas a tickets ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_replies (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  ticketId  INT NOT NULL,
  fromAdmin TINYINT(1) NOT NULL DEFAULT 0,
  authorName VARCHAR(255) NOT NULL DEFAULT 'Soporte',
  message   TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
);
