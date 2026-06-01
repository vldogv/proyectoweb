const pool = require('../config/db.config');

const Usuario = {
  async create(fullName, email, passwordHash) {
    const [result] = await pool.query(
      'INSERT INTO usuarios (fullName, email, password) VALUES (?, ?, ?)',
      [fullName, email, passwordHash]
    );
    return { id: result.insertId, fullName, email };
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, fullName, email, isAdmin, createdAt FROM usuarios WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async getAll() {
    const [rows] = await pool.query(
      'SELECT id, fullName, email, isAdmin, createdAt FROM usuarios ORDER BY id ASC'
    );
    return rows;
  },

  /** Actualiza nombre (y opcionalmente email e isAdmin) de un usuario */
  async updateProfile(id, { fullName, email }) {
    const fields = [];
    const values = [];
    if (fullName !== undefined) { fields.push('fullName = ?'); values.push(fullName); }
    if (email     !== undefined) { fields.push('email = ?');    values.push(email.toLowerCase()); }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** Actualiza contraseña (ya hasheada) */
  async updatePassword(id, passwordHash) {
    await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, id]);
  },

  /** Admin: actualiza cualquier campo */
  async adminUpdate(id, { fullName, email, isAdmin }) {
    const fields = [];
    const values = [];
    if (fullName !== undefined) { fields.push('fullName = ?'); values.push(fullName); }
    if (email    !== undefined) { fields.push('email = ?');    values.push(email.toLowerCase()); }
    if (isAdmin  !== undefined) { fields.push('isAdmin = ?');  values.push(isAdmin ? 1 : 0); }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  // ─── Tokens de recuperación de contraseña ────────────────────────────────

  async createResetToken(userId, token, expiresAt) {
    // Invalidar tokens anteriores
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE userId = ?', [userId]);
    await pool.query(
      'INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
  },

  async findResetToken(token) {
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expiresAt > NOW()',
      [token]
    );
    return rows[0] || null;
  },

  async markResetTokenUsed(token) {
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);
  },
};

module.exports = Usuario;
