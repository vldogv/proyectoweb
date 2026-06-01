const express    = require('express');
const router     = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/register',        AuthController.register);
router.post('/login',           AuthController.login);
router.get('/me',               verifyToken, AuthController.me);
router.put('/perfil',           verifyToken, AuthController.updateProfile);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password',  AuthController.resetPassword);

module.exports = router;
