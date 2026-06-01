/**
 * usuario.model.js
 * MODELO — Solo define la estructura de la tabla `usuarios`.
 * La lógica de acceso a datos vive en services/usuario.service.js
 */

module.exports = {
  tableName: 'usuarios',
  fields: {
    id:        { type: 'INT',          primaryKey: true, autoIncrement: true },
    fullName:  { type: 'VARCHAR(255)', nullable: false },
    email:     { type: 'VARCHAR(255)', nullable: false, unique: true },
    password:  { type: 'VARCHAR(255)', nullable: false, description: 'Hash bcrypt' },
    isAdmin:   { type: 'TINYINT(1)',   nullable: false, default: 0 },
    createdAt: { type: 'TIMESTAMP',    default: 'CURRENT_TIMESTAMP' },
  },
  relations: {
    direcciones:           { type: 'hasMany', foreignKey: 'userId' },
    pedidos:               { type: 'hasMany', foreignKey: 'userId' },
    tickets:               { type: 'hasMany', foreignKey: 'userId' },
    password_reset_tokens: { type: 'hasMany', foreignKey: 'userId' },
  },
};
