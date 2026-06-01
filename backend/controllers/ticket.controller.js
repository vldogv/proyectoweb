const Ticket   = require('../services/ticket.service');
const Usuario  = require('../services/usuario.service');
const emailSvc = require('../services/email.service');

const TicketController = {

  // ─── POST /api/tickets ── crear ticket (usuario auth o invitado) ──────────
  async create(req, res) {
    try {
      const { subject, message, priority, userName, userEmail } = req.body;
      if (!subject || !message)
        return res.status(400).json({ error: 'Asunto y mensaje son requeridos' });

      // Si hay JWT válido, usar datos del usuario autenticado
      let resolvedName  = userName;
      let resolvedEmail = userEmail;
      let resolvedUserId = null;

      if (req.userId) {
        const user = await Usuario.findById(req.userId);
        if (user) {
          resolvedName   = user.fullName;
          resolvedEmail  = user.email;
          resolvedUserId = user.id;
        }
      }

      if (!resolvedName || !resolvedEmail)
        return res.status(400).json({ error: 'Nombre y email son requeridos' });

      const ticket = await Ticket.create({
        userId:    resolvedUserId,
        userEmail: resolvedEmail,
        userName:  resolvedName,
        subject,
        message,
        priority: priority ?? 'normal',
      });

      // Emails en paralelo, no bloquear si fallan
      const adminEmail = process.env.EMAIL_ADMIN || process.env.EMAIL_USER;
      Promise.all([
        emailSvc.sendTicketConfirmation(resolvedEmail, resolvedName, ticket.id, subject),
        adminEmail ? emailSvc.sendTicketAdminNotification(adminEmail, ticket.id, resolvedName, subject, message) : Promise.resolve(),
      ]).catch(err => console.error('Error enviando emails de ticket:', err));

      res.status(201).json(ticket);
    } catch (err) {
      console.error('Error al crear ticket:', err);
      res.status(500).json({ error: 'Error al crear ticket' });
    }
  },

  // ─── GET /api/tickets/mis-tickets ── tickets del usuario autenticado ──────
  async getMisTickets(req, res) {
    try {
      const tickets = await Ticket.getByUserId(req.userId);
      res.json(tickets);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener tickets' });
    }
  },

  // ─── GET /api/tickets/:id ── ticket específico (solo del propio usuario) ──
  async getById(req, res) {
    try {
      const ticket = await Ticket.getById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
      // Verificar propiedad (admin puede ver todo)
      if (!req.isAdmin && ticket.userId !== req.userId)
        return res.status(403).json({ error: 'Sin acceso a este ticket' });
      res.json(ticket);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener ticket' });
    }
  },
};

module.exports = TicketController;
