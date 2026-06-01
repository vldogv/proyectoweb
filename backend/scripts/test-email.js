/**
 * Prueba la configuración de email.
 * Uso:  node backend/scripts/test-email.js   [correo-destino-opcional]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const nodemailer = require('nodemailer');

const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

console.log('───────────────────────────────────────');
console.log('  EMAIL_USER :', process.env.EMAIL_USER);
console.log('  EMAIL_PASS :', pass.length, 'caracteres (Gmail = 16 exactos)');
console.log('───────────────────────────────────────');

if (pass.length !== 16) {
  console.log('⚠️  El App Password NO tiene 16 caracteres.');
  console.log('    Genera uno nuevo en: https://myaccount.google.com/apppasswords');
  console.log('    Cópialo SIN espacios al .env (EMAIL_PASS=...)');
}

const t = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465',
  auth:   { user: (process.env.EMAIL_USER || '').trim(), pass },
});

(async () => {
  try {
    await t.verify();
    console.log('✅ Conexión SMTP correcta — credenciales válidas');

    const to = process.argv[2] || process.env.EMAIL_ADMIN || process.env.EMAIL_USER;
    const info = await t.sendMail({
      from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: 'Prueba Natureza ✔',
      text:    'Si lees esto, el envío de correos funciona correctamente.',
    });
    console.log('✅ Correo de prueba enviado a', to);
    console.log('   messageId:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  }
})();
