-- alter-db-v3.sql
-- Refactor: normaliza la dirección de envío usando FK a `direcciones`.
-- Los pedidos antiguos seguirán funcionando porque conservan shippingAddressJson.

USE natureza_db;

-- ─── 1. Agregar FK direccionId a pedidos ─────────────────────────────────────
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS direccionId INT NULL AFTER userId;

-- ─── 2. Permitir nullable a userId (ya estaba, defensivo) ────────────────────
ALTER TABLE pedidos
  MODIFY COLUMN userId INT NULL;

-- ─── 3. Constraint: si la dirección se elimina, el pedido conserva la fila ──
--      Pero queda con direccionId = NULL (se recurre a shippingAddressJson)
-- Nota: MySQL no permite IF NOT EXISTS en ADD CONSTRAINT.
--       Si ya existe el constraint, este ALTER fallará — en ese caso ignorar.
ALTER TABLE pedidos
  ADD CONSTRAINT fk_pedidos_direccion
    FOREIGN KEY (direccionId) REFERENCES direcciones(id)
    ON DELETE SET NULL;
