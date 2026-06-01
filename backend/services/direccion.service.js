const pool = require('../config/db.config');

const Direccion = {
  async getByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM direcciones WHERE userId = ? ORDER BY isDefault DESC, id ASC',
      [userId]
    );
    return rows.map(r => ({ ...r, isDefault: !!r.isDefault }));
  },

  async create(userId, data) {
    const { label, fullName, street, city, postalCode, phone, isDefault } = data;

    // Primera dirección del usuario siempre queda como default
    const [count] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM direcciones WHERE userId = ?',
      [userId]
    );
    const makeDefault = isDefault || count[0].cnt === 0 ? 1 : 0;

    if (makeDefault) {
      await pool.query(
        'UPDATE direcciones SET isDefault = 0 WHERE userId = ?',
        [userId]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO direcciones (userId, label, fullName, street, city, postalCode, phone, isDefault)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, label, fullName, street, city, postalCode, phone, makeDefault]
    );

    return {
      id: result.insertId, userId, label, fullName, street, city,
      postalCode, phone, isDefault: makeDefault === 1,
    };
  },

  async update(id, userId, data) {
    const { label, fullName, street, city, postalCode, phone, isDefault } = data;

    // Verificar propiedad
    const [rows] = await pool.query(
      'SELECT id FROM direcciones WHERE id = ? AND userId = ?',
      [id, userId]
    );
    if (rows.length === 0) return null;

    if (isDefault) {
      await pool.query(
        'UPDATE direcciones SET isDefault = 0 WHERE userId = ?',
        [userId]
      );
    }

    await pool.query(
      `UPDATE direcciones
       SET label=?, fullName=?, street=?, city=?, postalCode=?, phone=?, isDefault=?
       WHERE id=? AND userId=?`,
      [label, fullName, street, city, postalCode, phone, isDefault ? 1 : 0, id, userId]
    );

    const [updated] = await pool.query(
      'SELECT * FROM direcciones WHERE id = ?',
      [id]
    );
    return { ...updated[0], isDefault: !!updated[0].isDefault };
  },

  async delete(id, userId) {
    const [rows] = await pool.query(
      'SELECT * FROM direcciones WHERE id = ? AND userId = ?',
      [id, userId]
    );
    if (rows.length === 0) return false;

    const wasDefault = rows[0].isDefault;
    await pool.query(
      'DELETE FROM direcciones WHERE id = ? AND userId = ?',
      [id, userId]
    );

    // Si era la default, asignar la primera restante
    if (wasDefault) {
      const [remaining] = await pool.query(
        'SELECT id FROM direcciones WHERE userId = ? ORDER BY id ASC LIMIT 1',
        [userId]
      );
      if (remaining.length > 0) {
        await pool.query(
          'UPDATE direcciones SET isDefault = 1 WHERE id = ?',
          [remaining[0].id]
        );
      }
    }
    return true;
  },

  async setDefault(id, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM direcciones WHERE id = ? AND userId = ?',
      [id, userId]
    );
    if (rows.length === 0) return false;

    await pool.query(
      'UPDATE direcciones SET isDefault = 0 WHERE userId = ?',
      [userId]
    );
    await pool.query(
      'UPDATE direcciones SET isDefault = 1 WHERE id = ? AND userId = ?',
      [id, userId]
    );
    return true;
  },
};

module.exports = Direccion;
