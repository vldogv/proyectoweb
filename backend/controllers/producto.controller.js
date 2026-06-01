const Producto = require('../services/producto.service');

const ProductoController = {
  async getAll(req, res) {
    try {
      const productos = await Producto.getAll();
      res.json(productos);
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      res.status(500).json({ error: 'Error al obtener productos' });
    }
  },

  async getById(req, res) {
    try {
      const producto = await Producto.getById(req.params.id);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(producto);
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      res.status(500).json({ error: 'Error al obtener producto' });
    }
  },

  async getByCategory(req, res) {
    try {
      const productos = await Producto.getByCategory(req.params.category);
      res.json(productos);
    } catch (error) {
      console.error('Error obteniendo productos por categoria:', error);
      res.status(500).json({ error: 'Error al obtener productos' });
    }
  },

  async create(req, res) {
    try {
      const producto = await Producto.create(req.body);
      res.status(201).json(producto);
    } catch (error) {
      console.error('Error creando producto:', error);
      res.status(500).json({ error: 'Error al crear producto' });
    }
  },

  async update(req, res) {
    try {
      const existing = await Producto.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      const producto = await Producto.update(req.params.id, req.body);
      res.json(producto);
    } catch (error) {
      console.error('Error actualizando producto:', error);
      res.status(500).json({ error: 'Error al actualizar producto' });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await Producto.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      res.status(500).json({ error: 'Error al eliminar producto' });
    }
  }
};

module.exports = ProductoController;
