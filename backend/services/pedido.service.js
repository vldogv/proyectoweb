/**
 * pedido.model.js
 * Modelo del pedido. Esquema optimizado:
 *   - Direcciones: FK a `direcciones`
 *   - Opción de envío: FK a `shipping_options`
 *   - pedido_detalle: solo productoId + cantidad + precio (snapshot histórico)
 *     El nombre se obtiene con JOIN a productos
 */

const pool = require('../config/db.config');

const Pedido = {

  /** SELECT base con todos los JOINs */
  _pedidoSelect() {
    return `
      SELECT p.*,
        d.id          AS dir_id,
        d.label       AS dir_label,
        d.fullName    AS dir_fullName,
        d.street      AS dir_street,
        d.city        AS dir_city,
        d.postalCode  AS dir_postalCode,
        d.phone       AS dir_phone,
        so.label      AS so_label,
        so.carrier    AS so_carrier,
        so.estimatedDays AS so_days,
        f.rfc             AS fact_rfc,
        f.razonSocial     AS fact_razonSocial,
        f.regimenFiscal   AS fact_regimenFiscal,
        f.usoCFDI         AS fact_usoCFDI,
        f.domicilioFiscal AS fact_domicilioFiscal
      FROM pedidos p
      LEFT JOIN direcciones      d  ON d.id  = p.direccionId
      LEFT JOIN shipping_options so ON so.id = p.shippingOptionId
      LEFT JOIN pedido_factura   f  ON f.pedidoId = p.id
    `;
  },

  /** SELECT de items con JOIN a productos para obtener nombre actual */
  _detalleSelect(whereClause, params) {
    return pool.query(
      `SELECT pd.*, pr.name AS productoNombre, pr.imageUrl AS productoImage
         FROM pedido_detalle pd
         JOIN productos pr ON pr.id = pd.productoId
        WHERE ${whereClause}`,
      params
    );
  },

  // ─── Crear pedido (flujo nuevo: usuario auth + envío + pago) ──────────────

  async createNew(payload) {
    const {
      userId, direccionId, items, subtotal, total,
      shippingOption, shippingCost, trackingNumber,
      paymentMethod, paymentId,
    } = payload;

    const now = new Date();
    const initialTracking = JSON.stringify([
      { status: 'pending', label: 'Pedido confirmado', timestamp: now.toISOString() },
    ]);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Validar stock de todos los items antes de procesar
      for (const it of items) {
        const productoId = it.product?.id ?? it.productId;
        const cantidad   = it.quantity;
        const [[row]] = await conn.query(
          'SELECT stock, name FROM productos WHERE id = ? FOR UPDATE',
          [productoId]
        );
        if (!row) throw new Error(`Producto ${productoId} no existe`);
        if (row.stock < cantidad) {
          throw new Error(`Stock insuficiente para "${row.name}" (disponible: ${row.stock})`);
        }
      }

      // 2. Insertar el pedido
      const [result] = await conn.query(
        `INSERT INTO pedidos
           (userId, direccionId, subtotal, total,
            shippingOptionId, shippingCost,
            trackingNumber, shippingStatus, orderStatus,
            paymentMethod, paymentId, trackingHistoryJson)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)`,
        [
          userId, direccionId ?? null, subtotal, total,
          shippingOption?.id ?? null, shippingCost ?? 0,
          trackingNumber ?? null,
          paymentMethod ?? null, paymentId ?? null,
          initialTracking,
        ]
      );
      const pedidoId = result.insertId;

      // 3. Insertar detalle y descontar stock
      for (const it of items) {
        const productoId = it.product?.id ?? it.productId;
        const precio     = it.product?.price ?? it.unitPrice;
        const cantidad   = it.quantity;

        await conn.query(
          `INSERT INTO pedido_detalle (pedidoId, productoId, precio, cantidad)
           VALUES (?, ?, ?, ?)`,
          [pedidoId, productoId, precio, cantidad]
        );

        await conn.query(
          `UPDATE productos
              SET stock   = stock - ?,
                  inStock = IF(stock - ? <= 0, 0, inStock)
            WHERE id = ?`,
          [cantidad, cantidad, productoId]
        );
      }

      await conn.commit();
      return this._getPedidoByIdAdmin(pedidoId);

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // ─── Consultas usuario ────────────────────────────────────────────────────

  async getMisPedidos(userId) {
    const [pedidos] = await pool.query(
      `${this._pedidoSelect()} WHERE p.userId = ? ORDER BY p.createdAt DESC`,
      [userId]
    );
    if (pedidos.length === 0) return [];

    const ids = pedidos.map(p => p.id);
    const [detalles] = await this._detalleSelect(
      `pd.pedidoId IN (${ids.map(() => '?').join(',')})`, ids
    );
    return pedidos.map(p => this._mapToAngularOrder(p, detalles.filter(d => d.pedidoId === p.id)));
  },

  async getMiPedidoById(id, userId) {
    const [pedidos] = await pool.query(
      `${this._pedidoSelect()} WHERE p.id = ? AND p.userId = ?`, [id, userId]
    );
    if (pedidos.length === 0) return null;
    const [detalles] = await this._detalleSelect('pd.pedidoId = ?', [id]);
    return this._mapToAngularOrder(pedidos[0], detalles);
  },

  // ─── Consultas admin ──────────────────────────────────────────────────────

  async getAllForAdmin() {
    const [pedidos] = await pool.query(
      `${this._pedidoSelect()} WHERE p.userId IS NOT NULL ORDER BY p.createdAt DESC`
    );
    if (pedidos.length === 0) return [];
    const ids = pedidos.map(p => p.id);
    const [detalles] = await this._detalleSelect(
      `pd.pedidoId IN (${ids.map(() => '?').join(',')})`, ids
    );
    return pedidos.map(p => this._mapToAngularOrder(p, detalles.filter(d => d.pedidoId === p.id)));
  },

  async updateStatus(id, { orderStatus, shippingStatus }) {
    const fields = [];
    const values = [];
    if (orderStatus)    { fields.push('orderStatus = ?');    values.push(orderStatus); }
    if (shippingStatus) { fields.push('shippingStatus = ?'); values.push(shippingStatus); }
    if (fields.length === 0) return null;
    values.push(id);
    await pool.query(`UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`, values);
    return this._getPedidoByIdAdmin(id);
  },

  // ─── Helpers internos ─────────────────────────────────────────────────────

  async _getPedidoByIdAdmin(id) {
    const [pedidos] = await pool.query(`${this._pedidoSelect()} WHERE p.id = ?`, [id]);
    if (pedidos.length === 0) return null;
    const [detalles] = await this._detalleSelect('pd.pedidoId = ?', [id]);
    return this._mapToAngularOrder(pedidos[0], detalles);
  },

  /**
   * Convierte la fila JOIN-eada al formato Order esperado por el frontend.
   */
  _mapToAngularOrder(p, detalles = []) {
    // Dirección desde JOIN
    let shippingAddress = {};
    if (p.dir_id) {
      shippingAddress = {
        id:         p.dir_id,
        label:      p.dir_label,
        fullName:   p.dir_fullName,
        street:     p.dir_street,
        city:       p.dir_city,
        postalCode: p.dir_postalCode,
        phone:      p.dir_phone,
      };
    }

    // Tracking history desde JSON
    let trackingHistory = [];
    try {
      trackingHistory = (JSON.parse(p.trackingHistoryJson || '[]')).map(e => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
    } catch {}

    // Opción de envío desde JOIN
    let shippingOption = null;
    if (p.shippingOptionId) {
      shippingOption = {
        id:            p.shippingOptionId,
        label:         p.so_label,
        carrier:       p.so_carrier,
        estimatedDays: p.so_days,
        cost:          parseFloat(p.shippingCost) || 0,
      };
    }

    // Items con nombre desde JOIN con productos
    const items = detalles.map(d => ({
      productId:    d.productoId,
      productName:  d.productoNombre,
      productImage: d.productoImage ?? '',
      quantity:     d.cantidad,
      unitPrice:    parseFloat(d.precio),
    }));

    // Factura personalizada (CFDI con datos fiscales del comprador)
    const factura = p.fact_rfc ? {
      rfc:             p.fact_rfc,
      razonSocial:     p.fact_razonSocial,
      regimenFiscal:   p.fact_regimenFiscal,
      usoCFDI:         p.fact_usoCFDI,
      domicilioFiscal: p.fact_domicilioFiscal,
    } : null;

    return {
      id:              p.id.toString(),
      userId:          p.userId,
      items,
      subtotal:        parseFloat(p.subtotal) || 0,
      total:           parseFloat(p.total) || 0,
      status:          p.orderStatus || 'pending',
      shippingAddress,
      createdAt:       p.createdAt,
      shippingOption,
      shippingCost:    parseFloat(p.shippingCost) || 0,
      trackingNumber:  p.trackingNumber,
      shippingStatus:  p.shippingStatus || 'pending',
      trackingHistory,
      paymentMethod:   p.paymentMethod,
      paymentId:       p.paymentId,
      factura,
    };
  },
};

module.exports = Pedido;
