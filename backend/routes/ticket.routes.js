const express = require('express');
const router  = express.Router();
const TicketController = require('../controllers/ticket.controller');
const { verifyToken, verifyTokenOptional } = require('../middleware/auth.middleware');

// Crear ticket: opcional auth (usuarios invitados también pueden)
router.post('/', verifyTokenOptional, TicketController.create);

// Ver mis tickets (requiere auth)
router.get('/mis-tickets', verifyToken, TicketController.getMisTickets);

// Ver ticket específico (requiere auth)
router.get('/:id', verifyToken, TicketController.getById);

module.exports = router;
