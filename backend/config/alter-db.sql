-- alter-db.sql
-- Ejecutar UNA VEZ sobre la base de datos natureza_db ya existente.
-- Adapta la tabla `pedidos` para soportar el nuevo flujo de pago con autenticación,
-- envío y PayPal, sin romper el flujo antiguo (checkout CFDI).

USE natureza_db;

-- ─── 1. Hacer nullable las columnas obligatorias del flujo antiguo ────────────
--        (el nuevo flujo no las usa, pero deben seguir existiendo)
ALTER TABLE pedidos
  MODIFY COLUMN orderNumber  VARCHAR(50)  NULL DEFAULT NULL,
  MODIFY COLUMN nombre       VARCHAR(255) NULL DEFAULT NULL,
  MODIFY COLUMN email        VARCHAR(255) NULL DEFAULT NULL,
  MODIFY COLUMN telefono     VARCHAR(50)  NULL DEFAULT NULL,
  MODIFY COLUMN direccion    VARCHAR(500) NULL DEFAULT NULL,
  MODIFY COLUMN ciudad       VARCHAR(100) NULL DEFAULT NULL,
  MODIFY COLUMN codigoPostal VARCHAR(10)  NULL DEFAULT NULL,
  MODIFY COLUMN subtotal     DECIMAL(10,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN total        DECIMAL(10,2) NOT NULL DEFAULT 0;

-- ─── 2. Agregar columnas del nuevo flujo (solo si no existen) ─────────────────

-- Usuario autenticado
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS userId INT NULL AFTER id;

-- Estado del pedido y envío
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS orderStatus    VARCHAR(50) NULL DEFAULT 'pending' AFTER total,
  ADD COLUMN IF NOT EXISTS shippingStatus VARCHAR(50) NULL DEFAULT 'pending' AFTER orderStatus;

-- Opción de envío seleccionada
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS shippingOptionId    VARCHAR(50)  NULL AFTER shippingStatus,
  ADD COLUMN IF NOT EXISTS shippingOptionLabel VARCHAR(100) NULL AFTER shippingOptionId,
  ADD COLUMN IF NOT EXISTS shippingCarrier     VARCHAR(100) NULL AFTER shippingOptionLabel,
  ADD COLUMN IF NOT EXISTS shippingDays        INT          NULL AFTER shippingCarrier,
  ADD COLUMN IF NOT EXISTS shippingCost        DECIMAL(10,2) NULL DEFAULT 0 AFTER shippingDays;

-- Tracking
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS trackingNumber     VARCHAR(100) NULL AFTER shippingCost,
  ADD COLUMN IF NOT EXISTS trackingHistoryJson LONGTEXT     NULL AFTER trackingNumber;

-- Pago
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS paymentMethod VARCHAR(50) NULL AFTER trackingHistoryJson,
  ADD COLUMN IF NOT EXISTS paymentId     VARCHAR(100) NULL AFTER paymentMethod;

-- Dirección completa en JSON (nueva forma)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS shippingAddressJson LONGTEXT NULL AFTER paymentId;

-- ─── 3. Agregar columna stock a productos (si aún no existe) ─────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 10 AFTER inStock;

-- ─── 4. Tabla de usuarios (si no existe) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  fullName     VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  createdAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 5. Tabla de direcciones (si no existe) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS direcciones (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NOT NULL,
  alias     VARCHAR(100) NOT NULL DEFAULT 'Casa',
  street    VARCHAR(500) NOT NULL,
  city      VARCHAR(100) NOT NULL,
  state     VARCHAR(100) NOT NULL DEFAULT '',
  zip       VARCHAR(10)  NOT NULL DEFAULT '',
  country   VARCHAR(100) NOT NULL DEFAULT 'México',
  phone     VARCHAR(50)  NOT NULL DEFAULT '',
  isDefault TINYINT(1)   NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES usuarios(id) ON DELETE CASCADE
);
