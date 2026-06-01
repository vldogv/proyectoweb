/**
 * email.service.js
 * Servicio centralizado de envío de correos con Nodemailer.
 *
 * Variables .env requeridas:
 *   EMAIL_HOST     →  smtp.gmail.com  (o tu servidor SMTP)
 *   EMAIL_PORT     →  587
 *   EMAIL_USER     →  tu@email.com
 *   EMAIL_PASS     →  tu contraseña o App Password de Gmail
 *   EMAIL_FROM     →  "Natureza" <tu@email.com>
 */

const nodemailer = require('nodemailer');

// ─── Transporter (lazy-init para no fallar si no hay .env) ───────────────────
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    // Forzar IPv4 — algunas redes (escolares, institucionales) bloquean IPv6.
    // Sin esto Node.js intenta IPv6 primero y falla con EHOSTUNREACH.
    family: 4,
    // Timeouts cortos para no colgar la request si la red bloquea SMTP
    connectionTimeout: 10000, // 10 s
    greetingTimeout:   10000,
    socketTimeout:     15000,
    auth: {
      user: (process.env.EMAIL_USER || '').trim(),
      // Los App Passwords de Gmail se muestran con espacios — quitarlos siempre
      pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
    },
  });
  return _transporter;
}

const FROM = () => process.env.EMAIL_FROM || `"Natureza" <${process.env.EMAIL_USER}>`;

// ─── Helpers de layout ────────────────────────────────────────────────────────
const wrap = (content) => `
<!DOCTYPE html><html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/>
<style>
  body{margin:0;padding:0;background:#f4f1eb;font-family:'Helvetica Neue',Arial,sans-serif;}
  .shell{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;
         overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .hdr{background:#3a5a40;padding:28px 32px;}
  .hdr h1{margin:0;color:#fff;font-size:1.4rem;font-weight:700;letter-spacing:-.01em;}
  .hdr p{margin:4px 0 0;color:#c8e6c9;font-size:.85rem;}
  .body{padding:32px;}
  .body p{margin:0 0 16px;color:#3c3c3c;font-size:.95rem;line-height:1.6;}
  .btn{display:inline-block;background:#3a5a40;color:#fff;padding:12px 28px;
       border-radius:10px;text-decoration:none;font-weight:600;font-size:.95rem;
       margin:8px 0 16px;}
  .divider{border:none;border-top:1px solid #e4dfd5;margin:24px 0;}
  .small{font-size:.8rem;color:#8a9e8b;}
  .footer{background:#f4f1eb;padding:20px 32px;text-align:center;
          color:#8a9e8b;font-size:.78rem;}
</style></head>
<body><div class="shell">${content}
<div class="footer">Natureza © ${new Date().getFullYear()} · Productos naturales y artesanales</div>
</div></body></html>`;

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Correo de recuperación de contraseña.
 */
async function sendPasswordReset(email, fullName, resetUrl) {
  const html = wrap(`
    <div class="hdr"><h1>Natureza</h1><p>Recuperación de contraseña</p></div>
    <div class="body">
      <p>Hola <strong>${fullName}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva:</p>
      <a href="${resetUrl}" class="btn">Restablecer contraseña</a>
      <hr class="divider"/>
      <p class="small">Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio puedes ignorar este correo.</p>
      <p class="small">O copia este enlace en tu navegador:<br>${resetUrl}</p>
    </div>`);

  return getTransporter().sendMail({
    from:    FROM(),
    to:      email,
    subject: 'Restablece tu contraseña — Natureza',
    html,
  });
}

/**
 * Confirmación de nuevo ticket de soporte.
 */
async function sendTicketConfirmation(email, fullName, ticketId, subject) {
  const html = wrap(`
    <div class="hdr"><h1>Natureza</h1><p>Hemos recibido tu mensaje</p></div>
    <div class="body">
      <p>Hola <strong>${fullName}</strong>,</p>
      <p>Tu solicitud de soporte <strong>#${ticketId}</strong> ha sido recibida correctamente.</p>
      <p><strong>Asunto:</strong> ${subject}</p>
      <p>Te responderemos lo antes posible. Puedes revisar el estado de tu ticket en tu cuenta.</p>
      <hr class="divider"/>
      <p class="small">Si tienes más información para agregar, responde directamente a este correo o visita tu cuenta en la tienda.</p>
    </div>`);

  return getTransporter().sendMail({
    from:    FROM(),
    to:      email,
    subject: `Ticket #${ticketId} recibido — Natureza`,
    html,
  });
}

/**
 * Notificación al admin de nuevo ticket.
 */
async function sendTicketAdminNotification(adminEmail, ticketId, userName, subject, message) {
  const html = wrap(`
    <div class="hdr"><h1>Natureza Admin</h1><p>Nuevo ticket de soporte</p></div>
    <div class="body">
      <p><strong>Ticket #${ticketId}</strong> — ${userName}</p>
      <p><strong>Asunto:</strong> ${subject}</p>
      <p><strong>Mensaje:</strong></p>
      <p style="background:#f4f1eb;padding:16px;border-radius:8px;">${message.replace(/\n/g,'<br>')}</p>
      <hr class="divider"/>
      <p class="small">Responde desde el panel de administración.</p>
    </div>`);

  return getTransporter().sendMail({
    from:    FROM(),
    to:      adminEmail,
    subject: `[Nuevo ticket #${ticketId}] ${subject}`,
    html,
  });
}

/**
 * Respuesta de admin al usuario.
 */
async function sendTicketReply(email, fullName, ticketId, subject, replyMessage) {
  const html = wrap(`
    <div class="hdr"><h1>Natureza</h1><p>Respuesta a tu ticket #${ticketId}</p></div>
    <div class="body">
      <p>Hola <strong>${fullName}</strong>,</p>
      <p>Hemos respondido a tu solicitud de soporte sobre "<strong>${subject}</strong>":</p>
      <p style="background:#f4f1eb;padding:16px;border-radius:8px;">${replyMessage.replace(/\n/g,'<br>')}</p>
      <hr class="divider"/>
      <p class="small">Si necesitas más ayuda, responde a este correo o abre un nuevo ticket desde tu cuenta.</p>
    </div>`);

  return getTransporter().sendMail({
    from:    FROM(),
    to:      email,
    subject: `Re: Ticket #${ticketId} — ${subject}`,
    html,
  });
}

module.exports = {
  sendPasswordReset,
  sendTicketConfirmation,
  sendTicketAdminNotification,
  sendTicketReply,
};
