/**
 * Ejecutar UNA VEZ para crear o actualizar el usuario admin.
 * Uso:  node backend/scripts/crear-admin.js
 */
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const bcrypt = require('bcryptjs');
const pool   = require('../config/db.config');

const FULL_NAME = 'Admin';
const EMAIL     = 'a22300922@ceti.mx';
const PASSWORD  = 'admin123';

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  // Verificar si ya existe
  const [rows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [EMAIL]);

  if (rows.length > 0) {
    // Actualizar contraseña y marcar como admin
    await pool.query(
      'UPDATE usuarios SET fullName = ?, password = ?, isAdmin = 1 WHERE email = ?',
      [FULL_NAME, hash, EMAIL]
    );
    console.log(`✅ Usuario admin actualizado: ${EMAIL}`);
  } else {
    // Crear nuevo usuario admin
    await pool.query(
      'INSERT INTO usuarios (fullName, email, password, isAdmin) VALUES (?, ?, ?, 1)',
      [FULL_NAME, EMAIL, hash]
    );
    console.log(`✅ Usuario admin creado: ${EMAIL}`);
  }

  console.log(`   Email:      ${EMAIL}`);
  console.log(`   Contraseña: ${PASSWORD}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
