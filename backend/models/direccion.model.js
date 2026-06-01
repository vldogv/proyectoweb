/**
 * direccion.model.js
 * MODELO — Solo define la estructura de la tabla `direcciones`.
 * La lógica de acceso a datos vive en services/direccion.service.js
 */

module.exports = {
  tableName: 'direcciones',
  fields: {
    id:         { type: 'INT',          primaryKey: true, autoIncrement: true },
    userId:     { type: 'INT',          nullable: false, references: 'usuarios.id' },
    label:      { type: 'VARCHAR(100)', nullable: false, default: 'Casa' },
    fullName:   { type: 'VARCHAR(255)', nullable: false },
    street:     { type: 'VARCHAR(500)', nullable: false },
    city:       { type: 'VARCHAR(100)', nullable: false },
    postalCode: { type: 'VARCHAR(10)',  nullable: false },
    phone:      { type: 'VARCHAR(50)',  nullable: false },
    isDefault:  { type: 'TINYINT(1)',   default: 0 },
  },
  relations: {
    usuario: { type: 'belongsTo', foreignKey: 'userId' },
    pedidos: { type: 'hasMany',   foreignKey: 'direccionId' },
  },
};
