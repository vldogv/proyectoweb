/**
 * producto.model.js
 * MODELO — Solo define la estructura de la tabla `productos`.
 * La lógica de acceso a datos vive en services/producto.service.js
 */

module.exports = {
  tableName: 'productos',
  fields: {
    id:          { type: 'INT',           primaryKey: true, autoIncrement: true },
    name:        { type: 'VARCHAR(255)',  nullable: false },
    price:       { type: 'DECIMAL(10,2)', nullable: false },
    imageUrl:    { type: 'VARCHAR(500)',  nullable: false },
    category:    { type: 'VARCHAR(100)',  nullable: false },
    description: { type: 'TEXT',          nullable: true },
    inStock:     { type: 'TINYINT(1)',    default: 1 },
    stock:       { type: 'INT',           nullable: false, default: 10 },
    createdAt:   { type: 'TIMESTAMP',     default: 'CURRENT_TIMESTAMP' },
    updatedAt:   { type: 'TIMESTAMP',     onUpdate: 'CURRENT_TIMESTAMP' },
  },
  relations: {
    pedido_detalle: { type: 'hasMany', foreignKey: 'productoId' },
  },
};
