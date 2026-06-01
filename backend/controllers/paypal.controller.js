const Producto      = require('../services/producto.service');
const Pedido        = require('../services/pedido.service');
const PaypalService = require('../services/paypal.service');

/**
 * Espejo de las reglas de envio.service.ts.
 * Si las cambias en el frontend, cámbialas aquí también.
 *   subtotal <  500  → estándar 99   | express 199
 *   subtotal >= 500  → estándar 0    | express 149
 *   subtotal >= 1000 → estándar 0    | express 0
 */
function calcularCostoEnvio(subtotal, optionId) {
  if (subtotal >= 1000) return 0;
  if (subtotal >= 500)  return optionId === 'estandar' ? 0 : 149;
  return optionId === 'estandar' ? 99 : 199;
}

/** Genera un número de tracking espejo de envio.service.ts */
function generarTracking(optionId) {
  const now      = new Date();
  const fecha    =
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}`;
  const carrierId = optionId === 'express' ? 'EXP' : 'EST';
  const rand      = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MX-${carrierId}-${fecha}-${rand}`;
}

const PaypalController = {

  // ─── GET /api/paypal/config (público) ────────────────────────────────────
  /**
   * Devuelve el Client ID de PayPal para que el SDK del frontend
   * pueda cargar el script de paypal.com/sdk/js.
   * NO expone el Client Secret.
   */
  getConfig(req, res) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'PAYPAL_CLIENT_ID no configurado' });
    }
    res.json({ clientId });
  },

  // ─── POST /api/paypal/create-order (requiere JWT) ────────────────────────
  /**
   * Crea una orden en PayPal para el flujo SDK embebido.
   * Body:  { items: CartItem[], shippingOption: { id, ... }, shippingAddress }
   * Resp:  { paypalOrderId }
   *
   * Recalcula precios desde la BD — no confía en el total del frontend.
   */
  async createOrder(req, res) {
    try {
      const { items, shippingOption, shippingAddress } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
      }
      if (!shippingOption?.id) {
        return res.status(400).json({ error: 'Falta opción de envío' });
      }
      if (!shippingAddress) {
        return res.status(400).json({ error: 'Falta dirección de envío' });
      }

      // Validar y recalcular precios desde la BD
      const itemsValidados = [];
      let subtotal = 0;

      for (const item of items) {
        const productId = item.product?.id ?? item.productId;
        const cantidad  = item.quantity;

        if (!productId || cantidad <= 0) {
          return res.status(400).json({ error: 'Item de carrito inválido' });
        }

        const producto = await Producto.getById(productId);
        if (!producto) {
          return res.status(400).json({ error: `Producto ${productId} no existe` });
        }
        if (!producto.inStock || producto.stock < cantidad) {
          return res.status(400).json({
            error: `Producto "${producto.name}" sin stock suficiente`,
          });
        }

        const unitPrice = parseFloat(producto.price);
        subtotal += unitPrice * cantidad;
        itemsValidados.push({ productName: producto.name, unitPrice, quantity: cantidad });
      }

      const shippingCost  = calcularCostoEnvio(subtotal, shippingOption.id);
      const total         = subtotal + shippingCost;

      // Crear la orden en PayPal — ya NO necesita returnUrl/cancelUrl
      const { id: paypalOrderId } = await PaypalService.createOrder({
        items: itemsValidados,
        shippingCost,
        total,
      });

      res.json({ paypalOrderId });

    } catch (err) {
      console.error('Error creando orden PayPal:', err);
      res.status(500).json({ error: 'Error al crear orden de pago' });
    }
  },

  // ─── POST /api/paypal/capture-order/:paypalOrderId (requiere JWT) ─────────
  /**
   * El SDK llama a este endpoint después de que el usuario aprueba en el popup.
   * Body:  { items, shippingAddress, shippingOption }
   * Resp:  { order: Order }
   *
   * Captura el pago y SOLO si status === COMPLETED crea el pedido en BD.
   */
  async captureOrder(req, res) {
    try {
      const { paypalOrderId } = req.params;
      const { items, shippingAddress, shippingOption, factura } = req.body;

      if (!paypalOrderId) {
        return res.status(400).json({ error: 'Falta paypalOrderId' });
      }
      if (!items || !shippingAddress || !shippingOption) {
        return res.status(400).json({ error: 'Faltan datos del pedido' });
      }

      // Capturar el pago
      const capture = await PaypalService.captureOrder(paypalOrderId);

      if (capture.status !== 'COMPLETED') {
        return res.status(402).json({
          error:  'El pago no se completó',
          status: capture.status,
        });
      }

      // Recalcular precios desde la BD
      const itemsValidados = [];
      let subtotal = 0;

      for (const item of items) {
        const productId = item.product?.id ?? item.productId;
        const producto  = await Producto.getById(productId);
        if (!producto) continue;

        const unitPrice = parseFloat(producto.price);
        subtotal += unitPrice * item.quantity;
        itemsValidados.push({ product: producto, quantity: item.quantity });
      }

      if (itemsValidados.length === 0) {
        return res.status(400).json({ error: 'Items inválidos al capturar' });
      }

      const shippingCost   = calcularCostoEnvio(subtotal, shippingOption.id);
      const trackingNumber = generarTracking(shippingOption.id);

      // Crear el pedido en BD — usa FK direccionId si la dirección viene de las guardadas
      const pedido = await Pedido.createNew({
        userId:        req.userId,
        direccionId:   shippingAddress?.id ?? null,
        items:         itemsValidados,
        subtotal,
        total:         subtotal + shippingCost,
        shippingAddress,
        shippingOption,
        shippingCost,
        trackingNumber,
        paymentMethod: 'paypal',
        paymentId:     capture.captureId,
      });

      // Si pidió factura, guardar datos fiscales y re-leer el pedido
      if (factura && factura.rfc) {
        const Factura = require('../services/factura.service');
        await Factura.create(parseInt(pedido.id), factura);
        // El pedido ya incluye factura en _mapToAngularOrder gracias al JOIN
        pedido.factura = factura;
      }

      res.json({ order: pedido });

    } catch (err) {
      console.error('Error capturando pago PayPal:', err.message);
      // Error de stock (lanzado desde Pedido.createNew)
      if (/stock/i.test(err.message)) {
        return res.status(409).json({ error: err.message });
      }
      res.status(500).json({ error: 'Error al capturar el pago' });
    }
  },

  // ─── POST /api/paypal/webhook ──────────────────────────────────────────────
  /**
   * Stub para webhooks de PayPal.
   * En producción verificar la firma con headers paypal-* antes de procesar.
   */
  async webhook(req, res) {
    console.log('[PayPal webhook]',
      req.body?.event_type,
      'resource:', req.body?.resource?.id);
    res.status(200).json({ received: true });
  },
};

module.exports = PaypalController;
