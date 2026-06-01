/**
 * paypal.service.js
 * Wrapper sobre la API REST v2 de PayPal (Orders API) — flujo SDK embebido.
 * Usa fetch nativo (Node 18+).
 *
 * Variables de entorno requeridas (en el .env de la raíz):
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_API_BASE  →  https://api-m.sandbox.paypal.com  (sandbox)
 *                    →  https://api-m.paypal.com           (producción)
 */

const API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

// ─── Cache simple del access token ────────────────────────────────────────────
let _tokenCache = { value: null, expiresAt: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (_tokenCache.value && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.value;
  }

  const id     = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('Faltan PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET en .env');
  }

  const auth = Buffer.from(`${id}:${secret}`).toString('base64');

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal token error: ${res.status} ${err}`);
  }

  const data = await res.json();
  _tokenCache = {
    value:     data.access_token,
    expiresAt: now + (data.expires_in * 1000),
  };
  return _tokenCache.value;
}

// ─── Crear orden (SDK embebido) ───────────────────────────────────────────────
/**
 * Crea una orden en PayPal para el flujo SDK embebido.
 * No necesita returnUrl/cancelUrl — el SDK maneja la UI en página.
 *
 * @param {object} params
 * @param {Array}  params.items         { productName, unitPrice, quantity }
 * @param {number} params.shippingCost
 * @param {number} params.total         subtotal + shippingCost
 * @returns {{ id: string }}
 */
async function createOrder({ items, shippingCost, total }) {
  const token = await getAccessToken();

  const itemTotal = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  const body = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'MXN',
        value: total.toFixed(2),
        breakdown: {
          item_total: { currency_code: 'MXN', value: itemTotal.toFixed(2) },
          shipping:   { currency_code: 'MXN', value: (shippingCost ?? 0).toFixed(2) },
        },
      },
      items: items.map(i => ({
        name:        (i.productName || 'Producto').substring(0, 127),
        quantity:    i.quantity.toString(),
        unit_amount: { currency_code: 'MXN', value: i.unitPrice.toFixed(2) },
        category:    'PHYSICAL_GOODS',
      })),
    }],
  };

  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return { id: data.id };
}

// ─── Capturar orden ───────────────────────────────────────────────────────────
/**
 * Captura una orden ya aprobada por el comprador (flujo SDK o redirect).
 * @returns {{ id, status, captureId, amount, currency, payerEmail }}
 */
async function captureOrder(paypalOrderId) {
  const token = await getAccessToken();

  const res = await fetch(
    `${API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed: ${res.status} ${err}`);
  }

  const data    = await res.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    id:         data.id,
    status:     data.status,   // 'COMPLETED' = éxito
    captureId:  capture?.id,
    amount:     capture?.amount?.value,
    currency:   capture?.amount?.currency_code,
    payerEmail: data.payer?.email_address,
  };
}

module.exports = { getAccessToken, createOrder, captureOrder };
