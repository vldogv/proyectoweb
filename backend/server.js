const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const productoRoutes  = require('./routes/producto.routes');
const pedidoRoutes    = require('./routes/pedido.routes');
const authRoutes      = require('./routes/auth.routes');
const direccionRoutes = require('./routes/direccion.routes');
const paypalRoutes    = require('./routes/paypal.routes');
const adminRoutes     = require('./routes/admin.routes');
const ticketRoutes    = require('./routes/ticket.routes');
const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Servir imágenes subidas estáticamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/productos',  productoRoutes);
app.use('/api/pedidos',    pedidoRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/direcciones', direccionRoutes);
app.use('/api/paypal',     paypalRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/tickets',    ticketRoutes);
// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Natureza API running' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});

module.exports = app;
