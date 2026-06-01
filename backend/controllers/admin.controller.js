/**
 * admin.controller.js
 * Controlador del área de administración.
 * Sólo orquesta — toda la lógica de datos vive en los servicios.
 */

const Producto = require('../services/producto.service');
const Pedido   = require('../services/pedido.service');
const Usuario  = require('../services/usuario.service');
const Ticket   = require('../services/ticket.service');
const emailSvc = require('../services/email.service');

const AdminController = {

  // ─── USUARIOS ──────────────────────────────────────────────────────────────

  async listUsuarios(req, res) {
    try { res.json(await Usuario.getAll()); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener usuarios' }); }
  },

  async updateUsuario(req, res) {
    try {
      const { fullName, email, isAdmin } = req.body;
      const updated = await Usuario.adminUpdate(req.params.id, { fullName, email, isAdmin });
      if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  },

  // ─── UPLOAD DE IMAGEN ─────────────────────────────────────────────────────

  async uploadImagen(req, res) {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    // Devuelve la URL completa para guardar en producto.imageUrl
    const url = `http://localhost:4000/uploads/${req.file.filename}`;
    res.json({ filename: req.file.filename, url });
  },

  // ─── PRODUCTOS ─────────────────────────────────────────────────────────────

  async listProductos(req, res) {
    try { res.json(await Producto.getAll()); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener productos' }); }
  },

  async createProducto(req, res) {
    try {
      const p = await Producto.create(req.body);
      res.status(201).json(p);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al crear producto' });
    }
  },

  async updateProducto(req, res) {
    try {
      const existing = await Producto.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });
      const p = await Producto.update(req.params.id, req.body);
      res.json(p);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar producto' });
    }
  },

  async deleteProducto(req, res) {
    try {
      const deleted = await Producto.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json({ message: 'Producto eliminado' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al eliminar producto' });
    }
  },

  // ─── PEDIDOS ───────────────────────────────────────────────────────────────

  async listPedidos(req, res) {
    try { res.json(await Pedido.getAllForAdmin()); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener pedidos' }); }
  },

  async updatePedidoStatus(req, res) {
    try {
      const { orderStatus, shippingStatus } = req.body;
      if (!orderStatus && !shippingStatus)
        return res.status(400).json({ error: 'Nada que actualizar' });
      const updated = await Pedido.updateStatus(req.params.id, { orderStatus, shippingStatus });
      if (!updated) return res.status(404).json({ error: 'Pedido no encontrado' });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar estado' });
    }
  },

  // ─── TICKETS ───────────────────────────────────────────────────────────────

  async listTickets(req, res) {
    try { res.json(await Ticket.getAll()); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener tickets' }); }
  },

  async updateTicketStatus(req, res) {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: 'Status requerido' });
      const ticket = await Ticket.updateStatus(req.params.id, status);
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
      res.json(ticket);
    } catch {
      res.status(500).json({ error: 'Error al actualizar estado' });
    }
  },

  async updateTicketPriority(req, res) {
    try {
      const ticket = await Ticket.updatePriority(req.params.id, req.body.priority);
      res.json(ticket);
    } catch { res.status(500).json({ error: 'Error al actualizar prioridad' }); }
  },

  async replyTicket(req, res) {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

      const ticket = await Ticket.getById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

      const updated = await Ticket.addReply(req.params.id, {
        fromAdmin:  true,
        authorName: 'Soporte Natureza',
        message,
      });

      // Enviar email al usuario (no bloquear si falla)
      emailSvc.sendTicketReply(ticket.userEmail, ticket.userName, ticket.id, ticket.subject, message)
        .catch(err => console.error('Error enviando email de respuesta:', err));

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al responder ticket' });
    }
  },
};

module.exports = AdminController;
