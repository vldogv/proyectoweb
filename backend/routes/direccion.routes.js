const express    = require('express');
const router     = express.Router();
const DireccionController = require('../controllers/direccion.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.get('/',              DireccionController.getAll);
router.post('/',             DireccionController.create);
router.put('/:id',           DireccionController.update);
router.delete('/:id',        DireccionController.delete);
router.put('/:id/default',   DireccionController.setDefault);

module.exports = router;
