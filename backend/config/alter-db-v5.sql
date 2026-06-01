-- alter-db-v5.sql
-- Agrega tabla para datos fiscales opcionales del CFDI personalizado.

USE natureza_db;

CREATE TABLE IF NOT EXISTS pedido_factura (
  pedidoId        INT PRIMARY KEY,
  rfc             VARCHAR(13) NOT NULL,
  razonSocial     VARCHAR(255) NOT NULL,
  regimenFiscal   VARCHAR(10) NOT NULL,
  usoCFDI         VARCHAR(10) NOT NULL,
  domicilioFiscal VARCHAR(10) NOT NULL,
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE
);
