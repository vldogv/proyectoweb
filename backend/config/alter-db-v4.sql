-- alter-db-v4.sql
-- Optimización: elimina datos redundantes y normaliza la tabla pedidos.

USE natureza_db;

-- ─── 1. Nueva tabla `shipping_options` ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_options (
  id            VARCHAR(50)  PRIMARY KEY,
  label         VARCHAR(100) NOT NULL,
  carrier       VARCHAR(100) NOT NULL,
  estimatedDays INT          NOT NULL
);

INSERT IGNORE INTO shipping_options (id, label, carrier, estimatedDays) VALUES
  ('estandar', 'Envío Estándar', 'Correos de México', 7),
  ('express',  'Envío Express',  'DHL',              3);

-- ─── 2. Migrar JSON existente a direccionId (rescata datos antiguos) ────────
UPDATE pedidos
   SET direccionId = CAST(JSON_EXTRACT(shippingAddressJson, '$.id') AS UNSIGNED)
 WHERE direccionId IS NULL
   AND shippingAddressJson IS NOT NULL
   AND CAST(JSON_EXTRACT(shippingAddressJson, '$.id') AS UNSIGNED) > 0;

-- ─── 3. Quitar todas las columnas CFDI/legacy de pedidos ────────────────────
ALTER TABLE pedidos
  DROP COLUMN orderNumber,
  DROP COLUMN nombre,
  DROP COLUMN email,
  DROP COLUMN telefono,
  DROP COLUMN direccion,
  DROP COLUMN ciudad,
  DROP COLUMN codigoPostal,
  DROP COLUMN notas,
  DROP COLUMN requiereFactura,
  DROP COLUMN rfcCliente,
  DROP COLUMN nombreFiscal,
  DROP COLUMN regimenFiscal,
  DROP COLUMN usoCFDI,
  DROP COLUMN domicilioFiscal,
  DROP COLUMN formaPago,
  DROP COLUMN metodoPago,
  DROP COLUMN iva;

-- ─── 4. Quitar columnas redundantes (ahora viven en shipping_options) ──────
ALTER TABLE pedidos
  DROP COLUMN shippingOptionLabel,
  DROP COLUMN shippingCarrier,
  DROP COLUMN shippingDays,
  DROP COLUMN shippingAddressJson;

-- ─── 5. FK shippingOptionId → shipping_options ─────────────────────────────
ALTER TABLE pedidos
  ADD CONSTRAINT fk_pedidos_shipping_option
    FOREIGN KEY (shippingOptionId) REFERENCES shipping_options(id)
    ON DELETE SET NULL;

-- ─── 6. Limpiar pedido_detalle (nombre y subtotal son redundantes) ─────────
--      `precio` se conserva como snapshot histórico (precios pueden cambiar)
ALTER TABLE pedido_detalle
  DROP COLUMN nombre,
  DROP COLUMN subtotal;

-- ─── 7. Asegurar que productos.stock no sea negativo ───────────────────────
ALTER TABLE productos
  MODIFY COLUMN stock INT NOT NULL DEFAULT 10 CHECK (stock >= 0);
