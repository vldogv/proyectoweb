const express    = require('express');
const router     = express.Router();
const PaypalController = require('../controllers/paypal.controller');
const { verifyToken }  = require('../middleware/auth.middleware');

// Público: el frontend necesita el clientId para cargar el SDK
router.get('/config', PaypalController.getConfig);

// Autenticados: crear y capturar órdenes identifican al comprador por JWT
router.post('/create-order',                 verifyToken, PaypalController.createOrder);
router.post('/capture-order/:paypalOrderId', verifyToken, PaypalController.captureOrder);

// Webhook: PayPal llama directamente, sin JWT (verificar firma en producción)
router.post('/webhook', PaypalController.webhook);

module.exports = router;
