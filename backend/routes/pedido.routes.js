const express = require('express');
const router  = express.Router();
const PedidoController = require('../controllers/pedido.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas las rutas de pedidos requieren autenticación
router.post('/nuevo',          verifyToken, PedidoController.createNew);
router.get('/mis-pedidos',     verifyToken, PedidoController.getMisPedidos);
router.get('/mis-pedidos/:id', verifyToken, PedidoController.getMiPedidoById);

module.exports = router;
