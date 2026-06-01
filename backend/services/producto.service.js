const pool = require('../config/db.config');

const Producto = {
  async getAll() {
    const [rows] = await pool.query(
      'SELECT id, name, price, imageUrl, category, description, inStock, stock FROM productos ORDER BY id ASC'
    );
    return rows.map(row => ({
      ...row,
      inStock: Boolean(row.inStock),
      stock: row.stock ?? 0,
    }));
  },

  async getById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, price, imageUrl, category, description, inStock, stock FROM productos WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return { ...rows[0], inStock: Boolean(rows[0].inStock), stock: rows[0].stock ?? 0 };
  },

  async getByCategory(category) {
    const [rows] = await pool.query(
      'SELECT id, name, price, imageUrl, category, description, inStock, stock FROM productos WHERE category = ? ORDER BY id ASC',
      [category]
    );
    return rows.map(row => ({ ...row, inStock: Boolean(row.inStock), stock: row.stock ?? 0 }));
  },

  async create(producto) {
    const { name, price, imageUrl, category, description, inStock, stock } = producto;
    const [result] = await pool.query(
      'INSERT INTO productos (name, price, imageUrl, category, description, inStock, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, price, imageUrl, category, description, inStock ? 1 : 0, stock ?? 10]
    );
    return { id: result.insertId, ...producto };
  },

  async update(id, producto) {
    const { name, price, imageUrl, category, description, inStock, stock } = producto;
    await pool.query(
      'UPDATE productos SET name = ?, price = ?, imageUrl = ?, category = ?, description = ?, inStock = ?, stock = ? WHERE id = ?',
      [name, price, imageUrl, category, description, inStock ? 1 : 0, stock ?? 10, id]
    );
    return { id, ...producto };
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Producto;
