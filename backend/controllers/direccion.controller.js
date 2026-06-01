const Direccion = require('../services/direccion.service');

const DireccionController = {
  // GET /api/direcciones
  async getAll(req, res) {
    try {
      const addresses = await Direccion.getByUserId(req.userId);
      res.json(addresses);
    } catch (err) {
      console.error('Error obteniendo direcciones:', err);
      res.status(500).json({ error: 'Error al obtener direcciones' });
    }
  },

  // POST /api/direcciones
  async create(req, res) {
    try {
      const address = await Direccion.create(req.userId, req.body);
      res.status(201).json(address);
    } catch (err) {
      console.error('Error creando dirección:', err);
      res.status(500).json({ error: 'Error al crear dirección' });
    }
  },

  // PUT /api/direcciones/:id
  async update(req, res) {
    try {
      const address = await Direccion.update(
        parseInt(req.params.id),
        req.userId,
        req.body
      );
      if (!address) {
        return res.status(404).json({ error: 'Dirección no encontrada' });
      }
      res.json(address);
    } catch (err) {
      console.error('Error actualizando dirección:', err);
      res.status(500).json({ error: 'Error al actualizar dirección' });
    }
  },

  // DELETE /api/direcciones/:id
  async delete(req, res) {
    try {
      const result = await Direccion.delete(parseInt(req.params.id), req.userId);
      if (!result) {
        return res.status(404).json({ error: 'Dirección no encontrada' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error eliminando dirección:', err);
      res.status(500).json({ error: 'Error al eliminar dirección' });
    }
  },

  // PUT /api/direcciones/:id/default
  async setDefault(req, res) {
    try {
      const result = await Direccion.setDefault(parseInt(req.params.id), req.userId);
      if (!result) {
        return res.status(404).json({ error: 'Dirección no encontrada' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error estableciendo dirección predeterminada:', err);
      res.status(500).json({ error: 'Error al establecer dirección predeterminada' });
    }
  },
};

module.exports = DireccionController;
