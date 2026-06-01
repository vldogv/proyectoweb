const jwt = require('jsonwebtoken');

/**
 * Middleware JWT — verifica el token Bearer en el header Authorization.
 * Si es válido, coloca req.userId y llama next().
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId  = decoded.userId;
    req.isAdmin = decoded.isAdmin === true;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware opcional — si hay token lo decodifica, si no, sigue sin error.
 * Útil para rutas que funcionan tanto con usuario autenticado como invitado.
 */
const verifyTokenOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId  = decoded.userId;
      req.isAdmin = decoded.isAdmin === true;
    } catch { /* token inválido: ignorar */ }
  }
  next();
};

module.exports = { verifyToken, verifyTokenOptional };
