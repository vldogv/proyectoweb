const Pedido = require('../services/pedido.service');

const PedidoController = {

  /**
   * POST /api/pedidos/nuevo  (requiere JWT)
   * Crea un pedido con descuento de stock atómico (transacción).
   */
  async createNew(req, res) {
    try {
      const {
        items, shippingAddress, shippingOption,
        shippingCost, trackingNumber, paymentMethod, paymentId,
      } = req.body;

      if (!items || items.length === 0)
        return res.status(400).json({ error: 'El carrito está vacío' });

      const subtotal = items.reduce(
        (sum, i) => sum + (i.product?.price ?? i.unitPrice ?? 0) * i.quantity, 0
      );
      const total = subtotal + (shippingCost ?? 0);

      const pedido = await Pedido.createNew({
        userId:      req.userId,
        direccionId: shippingAddress?.id ?? null,
        items,
        subtotal,
        total,
        shippingOption,
        shippingCost,
        trackingNumber,
        paymentMethod,
        paymentId,
      });

      res.status(201).json(pedido);
    } catch (error) {
      console.error('Error creando pedido nuevo:', error.message);
      // Si fue por stock, devolver 409 (Conflict)
      if (/stock/i.test(error.message)) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error al crear pedido' });
    }
  },

  /** GET /api/pedidos/mis-pedidos  (JWT) */
  async getMisPedidos(req, res) {
    try { res.json(await Pedido.getMisPedidos(req.userId)); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener pedidos' }); }
  },

  /** GET /api/pedidos/mis-pedidos/:id  (JWT) */
  async getMiPedidoById(req, res) {
    try {
      const pedido = await Pedido.getMiPedidoById(parseInt(req.params.id), req.userId);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      res.json(pedido);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener pedido' });
    }
  },
};

module.exports = PedidoController;
