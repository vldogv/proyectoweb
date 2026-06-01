-- Crear base de datos
CREATE DATABASE IF NOT EXISTS natureza_db;
USE natureza_db;

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  imageUrl VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  inStock TINYINT(1) DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderNumber VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  direccion VARCHAR(500) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  codigoPostal VARCHAR(10) NOT NULL,
  notas TEXT,
  requiereFactura TINYINT(1) DEFAULT 0,
  rfcCliente VARCHAR(13),
  nombreFiscal VARCHAR(255),
  regimenFiscal VARCHAR(10),
  usoCFDI VARCHAR(10),
  domicilioFiscal VARCHAR(10),
  formaPago VARCHAR(5),
  metodoPago VARCHAR(5),
  subtotal DECIMAL(10, 2) NOT NULL,
  iva DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalle de pedidos
CREATE TABLE IF NOT EXISTS pedido_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedidoId INT NOT NULL,
  productoId INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  cantidad INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (productoId) REFERENCES productos(id) ON DELETE CASCADE
);

-- Datos iniciales de productos
INSERT INTO productos (name, price, imageUrl, category, description, inStock) VALUES
('Crema Hidratante de Lavanda', 299.00, 'lavanda.jpeg.webp', 'Cremas', 'Crema hidratante natural con extracto de lavanda. Suaviza y nutre la piel profundamente.', 1),
('Crema de Argan y Rosa Mosqueta', 349.00, 'aragon.webp', 'Cremas', 'Crema regeneradora con aceite de argan y rosa mosqueta. Ideal para piel seca y madura.', 1),
('Esencia de Arbol de Te', 189.00, 'te.jpg', 'Esencias', 'Aceite esencial 100% puro de arbol de te. Propiedades antibacterianas y purificantes.', 1),
('Esencia de Eucalipto', 169.00, 'eucalipto.jpeg.webp', 'Esencias', 'Esencia natural de eucalipto. Perfecta para aromaterapia y alivio respiratorio.', 1),
('Miel de Abeja Pura', 220.00, 'miel.jpg.webp', 'Mieles', 'Miel de abeja 100% natural y sin procesar. Cosechada artesanalmente de colmenas locales.', 1),
('Miel de Manuka', 480.00, 'manuka.jpg', 'Mieles', 'Miel de Manuka importada con propiedades antimicrobianas unicas. Alta concentracion de MGO.', 0);
