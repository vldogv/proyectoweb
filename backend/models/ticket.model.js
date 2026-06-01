/**
 * ticket.model.js
 * MODELO — Solo define la estructura de la tabla `tickets`.
 * La lógica de acceso a datos vive en services/ticket.service.js
 */

module.exports = {
  tableName: 'tickets',
  fields: {
    id:        { type: 'INT',          primaryKey: true, autoIncrement: true },
    userId:    { type: 'INT',          nullable: true, references: 'usuarios.id' },
    userEmail: { type: 'VARCHAR(255)', nullable: false },
    userName:  { type: 'VARCHAR(255)', nullable: false },
    subject:   { type: 'VARCHAR(255)', nullable: false },
    message:   { type: 'TEXT',         nullable: false },
    status:    { type: 'VARCHAR(50)',  default: 'open',   description: 'open | in_progress | resolved | closed' },
    priority:  { type: 'VARCHAR(50)',  default: 'normal', description: 'low | normal | high | urgent' },
    createdAt: { type: 'TIMESTAMP',    default: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: 'TIMESTAMP',    onUpdate: 'CURRENT_TIMESTAMP' },
  },
  relations: {
    usuario: { type: 'belongsTo', foreignKey: 'userId' },
    replies: { type: 'hasMany',   foreignKey: 'ticketId', table: 'ticket_replies' },
  },
};
