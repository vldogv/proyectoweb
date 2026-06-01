/**
 * adminMiddleware — verifica que el JWT tenga isAdmin: true.
 * Debe usarse DESPUÉS de verifyToken.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
};

module.exports = { adminMiddleware };
