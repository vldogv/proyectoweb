const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const Usuario = require('../services/usuario.service');
const emailSvc = require('../services/email.service');

const AuthController = {
  // ─── POST /api/auth/register ─────────────────────────────────────────────
  async register(req, res) {
    try {
      const { fullName, email, password } = req.body;
      if (!fullName || !email || !password)
        return res.status(400).json({ error: 'Todos los campos son requeridos' });

      const existing = await Usuario.findByEmail(email.toLowerCase());
      if (existing)
        return res.status(400).json({ error: 'Este email ya está registrado' });

      const passwordHash = await bcrypt.hash(password, 10);
      const user  = await Usuario.create(fullName, email.toLowerCase(), passwordHash);
      const token = jwt.sign({ userId: user.id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        token,
        user: { id: user.id, fullName: user.fullName, email: user.email, isAdmin: false },
      });
    } catch (err) {
      console.error('Error en registro:', err);
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  },

  // ─── POST /api/auth/login ────────────────────────────────────────────────
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });

      const user = await Usuario.findByEmail(email.toLowerCase());
      if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

      const isAdmin = Boolean(user.isAdmin);
      const token   = jwt.sign({ userId: user.id, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, isAdmin } });
    } catch (err) {
      console.error('Error en login:', err);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  },

  // ─── GET /api/auth/me ────────────────────────────────────────────────────
  async me(req, res) {
    try {
      const user = await Usuario.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ id: user.id, fullName: user.fullName, email: user.email, isAdmin: Boolean(user.isAdmin) });
    } catch (err) {
      console.error('Error en /me:', err);
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  },

  // ─── PUT /api/auth/perfil ────────────────────────────────────────────────
  async updateProfile(req, res) {
    try {
      const { fullName, currentPassword, newPassword } = req.body;

      // Validar que hay al menos algo que actualizar
      if (!fullName && !newPassword)
        return res.status(400).json({ error: 'No hay cambios para guardar' });

      const user = await Usuario.findByEmail(
        (await Usuario.findById(req.userId)).email
      );

      // Si quiere cambiar contraseña, verificar la actual
      if (newPassword) {
        if (!currentPassword)
          return res.status(400).json({ error: 'Debes ingresar tu contraseña actual' });
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok)
          return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        if (newPassword.length < 6)
          return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        const hash = await bcrypt.hash(newPassword, 10);
        await Usuario.updatePassword(req.userId, hash);
      }

      // Actualizar nombre si viene
      let updated = user;
      if (fullName) {
        updated = await Usuario.updateProfile(req.userId, { fullName });
      }

      res.json({ id: updated.id, fullName: updated.fullName, email: updated.email, isAdmin: Boolean(updated.isAdmin) });
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  },

  // ─── POST /api/auth/forgot-password ─────────────────────────────────────
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requerido' });

      // Siempre responder 200 para no revelar si el email existe
      const user = await Usuario.findByEmail(email.toLowerCase());
      if (!user) return res.json({ message: 'Si el email existe, recibirás un enlace de recuperación.' });

      const token     = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await Usuario.createResetToken(user.id, token, expiresAt);

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      // Envío de email fire-and-forget — si la red bloquea SMTP (típico en
      // redes escolares/institucionales) el flujo no se cae. El token YA está
      // guardado en BD y el usuario podrá reintentar más tarde.
      emailSvc.sendPasswordReset(user.email, user.fullName, resetUrl)
        .catch(err => console.error('Error enviando email de recuperación:', err.code || err.message));

      // En modo desarrollo: devuelve la URL para probar sin depender del email.
      // En producción esto NO se envía (sería un riesgo de seguridad).
      const isDev = process.env.NODE_ENV !== 'production';
      const response = { message: 'Si el email existe, recibirás un enlace de recuperación.' };
      if (isDev) {
        response.devResetUrl = resetUrl;
        console.log('🔧 [DEV] URL de reset para', user.email, ':', resetUrl);
      }
      res.json(response);
    } catch (err) {
      console.error('Error en forgot-password:', err);
      res.status(500).json({ error: 'Error al procesar solicitud' });
    }
  },

  // ─── POST /api/auth/reset-password ──────────────────────────────────────
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword)
        return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
      if (newPassword.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

      const record = await Usuario.findResetToken(token);
      if (!record)
        return res.status(400).json({ error: 'El enlace no es válido o ya expiró' });

      const hash = await bcrypt.hash(newPassword, 10);
      await Usuario.updatePassword(record.userId, hash);
      await Usuario.markResetTokenUsed(token);

      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
      console.error('Error en reset-password:', err);
      res.status(500).json({ error: 'Error al restablecer contraseña' });
    }
  },
};

module.exports = AuthController;
