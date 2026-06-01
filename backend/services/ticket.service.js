const pool = require('../config/db.config');

const Ticket = {

  async create({ userId, userEmail, userName, subject, message, priority }) {
    const [r] = await pool.query(
      `INSERT INTO tickets (userId, userEmail, userName, subject, message, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId ?? null, userEmail, userName, subject, message, priority ?? 'normal']
    );
    return this.getById(r.insertId);
  },

  async getById(id) {
    const [[ticket]] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) return null;
    const [replies] = await pool.query(
      'SELECT * FROM ticket_replies WHERE ticketId = ? ORDER BY createdAt ASC', [id]
    );
    return { ...ticket, replies };
  },

  async getByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM tickets WHERE userId = ? ORDER BY updatedAt DESC', [userId]
    );
    const ids = rows.map(t => t.id);
    if (ids.length === 0) return rows;
    const [replies] = await pool.query(
      `SELECT * FROM ticket_replies WHERE ticketId IN (${ids.map(() => '?').join(',')}) ORDER BY createdAt ASC`,
      ids
    );
    return rows.map(t => ({
      ...t,
      replies: replies.filter(r => r.ticketId === t.id),
    }));
  },

  async getAll() {
    const [rows] = await pool.query('SELECT * FROM tickets ORDER BY updatedAt DESC');
    if (rows.length === 0) return rows;
    const ids = rows.map(t => t.id);
    const [replies] = await pool.query(
      `SELECT * FROM ticket_replies WHERE ticketId IN (${ids.map(() => '?').join(',')}) ORDER BY createdAt ASC`,
      ids
    );
    return rows.map(t => ({
      ...t,
      replies: replies.filter(r => r.ticketId === t.id),
    }));
  },

  async addReply(ticketId, { fromAdmin, authorName, message }) {
    await pool.query(
      'INSERT INTO ticket_replies (ticketId, fromAdmin, authorName, message) VALUES (?, ?, ?, ?)',
      [ticketId, fromAdmin ? 1 : 0, authorName, message]
    );
    // Actualizar updatedAt del ticket
    await pool.query(
      'UPDATE tickets SET updatedAt = NOW() WHERE id = ?', [ticketId]
    );
    return this.getById(ticketId);
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);
    return this.getById(id);
  },

  async updatePriority(id, priority) {
    await pool.query('UPDATE tickets SET priority = ? WHERE id = ?', [priority, id]);
    return this.getById(id);
  },
};

module.exports = Ticket;
