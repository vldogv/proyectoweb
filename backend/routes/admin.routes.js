/**
 * admin.routes.js
 * Define las rutas del área admin. NO contiene lógica de datos —
 * sólo enruta a AdminController. Toda la persistencia vive en los modelos.
 */

const express = require('express');
const router  = express.Router();
const AdminController = require('../controllers/admin.controller');
const upload  = require('../middleware/upload.middleware');
const { verifyToken }     = require('../middleware/auth.middleware');
const { adminMiddleware } = require('../middleware/admin.middleware');

// Todas las rutas admin requieren JWT válido + isAdmin
router.use(verifyToken, adminMiddleware);

// ─── Upload de imágenes ────────────────────────────────────────────────────
router.post('/upload-image', upload.single('image'), AdminController.uploadImagen);

// ─── Usuarios ───────────────────────────────────────────────────────────────
router.get('/usuarios',                    AdminController.listUsuarios);
router.put('/usuarios/:id',                AdminController.updateUsuario);

// ─── Productos ──────────────────────────────────────────────────────────────
router.get('/productos',                   AdminController.listProductos);
router.post('/productos',                  AdminController.createProducto);
router.put('/productos/:id',               AdminController.updateProducto);
router.delete('/productos/:id',            AdminController.deleteProducto);

// ─── Pedidos ────────────────────────────────────────────────────────────────
router.get('/pedidos',                     AdminController.listPedidos);
router.put('/pedidos/:id/status',          AdminController.updatePedidoStatus);

// ─── Tickets ────────────────────────────────────────────────────────────────
router.get('/tickets',                     AdminController.listTickets);
router.put('/tickets/:id/status',          AdminController.updateTicketStatus);
router.put('/tickets/:id/priority',        AdminController.updateTicketPriority);
router.post('/tickets/:id/reply',          AdminController.replyTicket);

module.exports = router;
