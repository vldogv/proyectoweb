/**
 * pedido.model.js
 * MODELO — Solo define la estructura de la tabla `pedidos`.
 * La lógica de acceso a datos vive en services/pedido.service.js
 */

module.exports = {
  tableName: 'pedidos',
  fields: {
    id:                  { type: 'INT',           primaryKey: true, autoIncrement: true },
    userId:              { type: 'INT',           nullable: true,  references: 'usuarios.id' },
    direccionId:         { type: 'INT',           nullable: true,  references: 'direcciones.id', onDelete: 'SET NULL' },
    subtotal:            { type: 'DECIMAL(10,2)', nullable: false },
    total:               { type: 'DECIMAL(10,2)', nullable: false },
    shippingOptionId:    { type: 'VARCHAR(50)',   nullable: true,  references: 'shipping_options.id' },
    shippingCost:        { type: 'DECIMAL(10,2)', default: 0.00 },
    trackingNumber:      { type: 'VARCHAR(100)',  nullable: true },
    shippingStatus:      { type: 'VARCHAR(50)',   default: 'pending' },
    orderStatus:         { type: 'VARCHAR(50)',   default: 'pending' },
    paymentMethod:       { type: 'VARCHAR(50)',   nullable: true,  description: 'paypal | card_simulated' },
    paymentId:           { type: 'VARCHAR(100)',  nullable: true },
    trackingHistoryJson: { type: 'TEXT',          nullable: true },
    createdAt:           { type: 'TIMESTAMP',     default: 'CURRENT_TIMESTAMP' },
  },
  relations: {
    pedido_detalle: { type: 'hasMany',  foreignKey: 'pedidoId' },
    pedido_factura: { type: 'hasOne',   foreignKey: 'pedidoId' },
    usuario:        { type: 'belongsTo', foreignKey: 'userId' },
    direccion:      { type: 'belongsTo', foreignKey: 'direccionId' },
    shippingOption: { type: 'belongsTo', foreignKey: 'shippingOptionId' },
  },
};
