/**
 * factura.model.js
 * MODELO — Solo define la estructura de la tabla `pedido_factura`.
 * La lógica de acceso a datos vive en services/factura.service.js
 */

module.exports = {
  tableName: 'pedido_factura',
  fields: {
    pedidoId:        { type: 'INT',          primaryKey: true, references: 'pedidos.id', onDelete: 'CASCADE' },
    rfc:             { type: 'VARCHAR(13)',  nullable: false },
    razonSocial:     { type: 'VARCHAR(255)', nullable: false },
    regimenFiscal:   { type: 'VARCHAR(10)',  nullable: false },
    usoCFDI:         { type: 'VARCHAR(10)',  nullable: false },
    domicilioFiscal: { type: 'VARCHAR(10)',  nullable: false },
    createdAt:       { type: 'TIMESTAMP',    default: 'CURRENT_TIMESTAMP' },
  },
  relations: {
    pedido: { type: 'belongsTo', foreignKey: 'pedidoId' },
  },
};
