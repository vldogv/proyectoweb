const express = require('express');
const router = express.Router();
const ProductoController = require('../controllers/producto.controller');

router.get('/', ProductoController.getAll);
router.get('/:id', ProductoController.getById);
router.get('/category/:category', ProductoController.getByCategory);
router.post('/', ProductoController.create);
router.put('/:id', ProductoController.update);
router.delete('/:id', ProductoController.delete);

module.exports = router;
