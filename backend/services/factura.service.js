/**
 * factura.model.js
 * Modelo para los datos fiscales opcionales asociados a un pedido (CFDI personalizado).
 */

const pool = require('../config/db.config');

const Factura = {

  async create(pedidoId, data) {
    const { rfc, razonSocial, regimenFiscal, usoCFDI, domicilioFiscal } = data;
    await pool.query(
      `INSERT INTO pedido_factura
         (pedidoId, rfc, razonSocial, regimenFiscal, usoCFDI, domicilioFiscal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pedidoId, rfc.toUpperCase(), razonSocial, regimenFiscal, usoCFDI, domicilioFiscal]
    );
    return this.getByPedidoId(pedidoId);
  },

  async getByPedidoId(pedidoId) {
    const [rows] = await pool.query(
      'SELECT * FROM pedido_factura WHERE pedidoId = ?', [pedidoId]
    );
    return rows[0] || null;
  },
};

module.exports = Factura;
