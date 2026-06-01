# 📚 Explicación de la Base de Datos — Para presentar

> Guion listo para explicar cada tabla, cada columna y por qué existe en el sistema. Léelo de arriba hacia abajo: empieza con usuarios (la base del sistema) y termina con tablas auxiliares.

---

## 🎯 Filosofía general del diseño

La base de datos sigue tres principios:

1. **Normalización:** los datos no se duplican. Cada cosa vive en una sola tabla y se conecta con otras mediante **llaves foráneas (FK)**.
2. **Identidad por ID numérico:** cada registro tiene un `id` autoincremental que lo identifica de forma única. Los IDs nunca se reutilizan; aunque borres un registro, su número no vuelve.
3. **Integridad referencial:** las relaciones tienen reglas (`ON DELETE CASCADE` o `SET NULL`) para que la BD no quede inconsistente si se borra algo.

---

## 1️⃣ Tabla `usuarios` — La base del sistema

> **Propósito:** Identifica a cada persona que interactúa con la tienda.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador único e inmutable del usuario. Es el número que el sistema usa internamente para reconocerlo en **TODAS** las demás tablas (direcciones, pedidos, tickets, etc.). Si cambias tu nombre o email, este ID nunca cambia. |
| `fullName` | Nombre completo del cliente (visible en perfil, pedidos, tickets). |
| `email` | Email único — es la "puerta de entrada" para el login. La restricción `UNIQUE` garantiza que no haya dos usuarios con el mismo correo. |
| `password` | Contraseña almacenada como **hash bcrypt** (no en texto plano). Aunque alguien robe la BD, no puede leer las contraseñas reales. |
| `isAdmin` | Bandera booleana (`0` o `1`). Si es `1`, el usuario tiene acceso al panel admin. Esta es la base del control de acceso del sistema. |
| `createdAt` | Fecha en que se creó la cuenta. Útil para auditoría y reportes ("usuarios nuevos este mes"). |

**Cómo se usa en el sistema:**
- Al hacer login, el JWT que se genera contiene este `id` + `isAdmin`
- El backend usa `req.userId` para saber a quién corresponde cada petición
- El `adminGuard` del frontend y el `adminMiddleware` del backend usan `isAdmin` para proteger el panel

---

## 2️⃣ Tabla `direcciones` — Lugares de envío de cada usuario

> **Propósito:** Guarda las direcciones de envío que el cliente registra. Un usuario puede tener varias (casa, oficina, etc.).

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador único de la dirección. Se usa cuando un pedido referencia "esta dirección específica". |
| `userId` | **FK → usuarios.id**. Conecta la dirección con su dueño. Si el usuario no existe, esta dirección no tiene sentido. |
| `label` | Etiqueta libre que el usuario escribe ("Casa", "Oficina", "Casa de mamá"). |
| `fullName` | Nombre del destinatario. No tiene que ser el del comprador (puede mandar regalo a otra persona). |
| `street` | Calle y número. |
| `city` | Ciudad. |
| `postalCode` | Código postal — importante para CFDI y cálculos de envío. |
| `phone` | Teléfono de contacto para la entrega. |
| `isDefault` | Bandera (`0` o `1`). El sistema garantiza por código que solo **una** dirección del usuario tiene `isDefault=1`. Esta es la que se preselecciona al pagar. |

**Cómo se usa en el sistema:**
- En `/cuenta` → pestaña "Direcciones" se hace CRUD completo
- En `/pago` se muestra el listado y el cliente elige una (o crea nueva inline)
- Al crear un pedido, se guarda el `id` de la dirección elegida → así el JOIN reconstruye los datos sin duplicar

---

## 3️⃣ Tabla `productos` — El catálogo

> **Propósito:** Inventario de productos a la venta.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador único del producto. Las líneas de un pedido referencian este número, no el nombre — así si renombras un producto, los pedidos viejos siguen apuntando bien. |
| `name` | Nombre visible en el catálogo ("Crema Hidratante de Lavanda"). |
| `price` | Precio actual del producto. `DECIMAL(10,2)` para evitar errores de redondeo con dinero. |
| `imageUrl` | URL o nombre de archivo de la imagen. Puede apuntar a `frontend/public/...` o a `http://localhost:4000/uploads/...` (imágenes subidas desde el admin). |
| `category` | Categoría a la que pertenece (Cremas, Esencias, Mieles, Jabones, Aceites, Otros). |
| `description` | Descripción larga que aparece en el detalle. |
| `inStock` | Bandera (`0` o `1`). Permite al admin **ocultar** un producto del catálogo sin borrarlo. |
| `stock` | Unidades disponibles. Se decrementa automáticamente en una **transacción atómica** cuando se confirma una compra. |
| `createdAt` | Fecha en que se creó. |
| `updatedAt` | Fecha en que se modificó por última vez. MySQL la actualiza sola con `ON UPDATE`. |

**Cómo se usa en el sistema:**
- `/catalogo` lee toda la tabla con filtros
- `/producto/:id` lee uno específico
- Cuando alguien paga, el backend hace `SELECT ... FOR UPDATE` (bloqueo pesimista) y luego `UPDATE productos SET stock = stock - cantidad` dentro de una transacción
- El panel admin permite CRUD completo

---

## 4️⃣ Tabla `shipping_options` — Catálogo de opciones de envío

> **Propósito:** Define las opciones de paquetería disponibles. **Tabla pequeña con datos casi estáticos** — pero normalizada para que cuando el admin quiera agregar una nueva paquetería (FedEx, Estafeta), solo agregue una fila.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador en formato string (`'estandar'`, `'express'`). Es más legible que un número y nunca cambia. |
| `label` | Nombre visible para el cliente ("Envío Estándar", "Envío Express"). |
| `carrier` | Paquetería real que entrega ("Correos de México", "DHL"). |
| `estimatedDays` | Días estimados de entrega. El sistema calcula la fecha sumando estos días a la fecha del pedido. |

**Datos actuales:**
```
estandar | Envío Estándar | Correos de México | 7 días
express  | Envío Express  | DHL               | 3 días
```

**Cómo se usa en el sistema:**
- En `/pago` el cliente elige una opción (genera un radio button por cada fila)
- El pedido guarda solo el `id` (`'estandar'` o `'express'`) → el JOIN obtiene label, carrier y días sin duplicar texto
- El costo de envío NO está en esta tabla porque varía según el subtotal del carrito (reglas dinámicas: >$500 gratis estándar, >$1000 gratis ambos)

---

## 5️⃣ Tabla `pedidos` — El corazón del e-commerce

> **Propósito:** Cada fila representa una compra realizada. Es la tabla más conectada del sistema — referencia a usuario, dirección, opción de envío y se conecta con detalle de productos y factura.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador único del pedido. El cliente lo ve en su seguimiento ("Pedido #5"). |
| `userId` | **FK → usuarios.id**. Quién hizo la compra. Es `NULL`-able por compatibilidad con flujos antiguos. |
| `direccionId` | **FK → direcciones.id**. A dónde se envía. `ON DELETE SET NULL` — si el usuario borra su dirección, el pedido conserva su ID `NULL` (no se rompe). |
| `subtotal` | Suma de productos (sin envío). |
| `total` | `subtotal + shippingCost` — lo que realmente se cobró. |
| `shippingOptionId` | **FK → shipping_options.id**. Qué paquetería seleccionó. |
| `shippingCost` | Costo del envío al momento de la compra. Se guarda **aunque sea 0**, para historial. |
| `trackingNumber` | Número de guía generado (`MX-EST-20260512-A7K3PQ`). Único por pedido. |
| `shippingStatus` | Estado del envío: `pending`, `ready`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`. El admin lo actualiza desde el panel. |
| `orderStatus` | Estado del pedido en general: `pending`, `processing`, `shipped`, `delivered`, `cancelled`. Separado del envío para distinguir "pedido pagado" vs "envío en camino". |
| `paymentMethod` | Método con el que se pagó: `'paypal'` o `'card_simulated'`. |
| `paymentId` | ID que PayPal asignó a la transacción. Sirve para conciliar pagos y disputas. |
| `trackingHistoryJson` | Historial de eventos del envío en formato JSON (timeline). |
| `createdAt` | Fecha exacta de la compra. |

**Cómo se usa en el sistema:**
- En `/cuenta` → "Mis Pedidos" se listan los del usuario actual con `WHERE userId = ?`
- En `/pedido/:id` se muestra el detalle con timeline de tracking
- En `/admin` → tab Pedidos se listan TODOS con `LEFT JOIN direcciones` y `LEFT JOIN shipping_options` para mostrar toda la info en una sola query
- El admin actualiza `orderStatus` y `shippingStatus` desde dropdowns

---

## 6️⃣ Tabla `pedido_detalle` — Las líneas de cada pedido

> **Propósito:** Como un pedido tiene varios productos, esta tabla guarda **una fila por cada producto del pedido**. Es la relación "muchos a muchos" entre pedidos y productos.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador único de la línea. |
| `pedidoId` | **FK → pedidos.id** con `ON DELETE CASCADE`. Si se borra el pedido, sus líneas se borran solas. |
| `productoId` | **FK → productos.id**. Qué producto se compró. |
| `precio` | Precio del producto **al momento de la compra**. Es un "snapshot histórico" — si subimos el precio después, el pedido viejo sigue mostrando el precio que pagó. |
| `cantidad` | Cuántas unidades de ese producto. |

**Por qué no guardamos el nombre aquí:**
- Lo obtenemos con `JOIN productos` al consultar. Evita duplicación.
- Si el admin renombra el producto, los pedidos siguen apuntando bien al `productoId`.

**Cómo se usa en el sistema:**
- Al crear un pedido se hace un `INSERT` por cada producto del carrito
- En el detalle del pedido se hace `SELECT pd.*, pr.name FROM pedido_detalle pd JOIN productos pr ON pr.id = pd.productoId`
- El CFDI se genera leyendo de aquí

---

## 7️⃣ Tabla `pedido_factura` — Datos fiscales opcionales

> **Propósito:** Si un pedido requiere CFDI personalizado (no genérico), aquí se guardan los datos fiscales del comprador. **Relación 1:1 opcional** con el pedido.

| Columna | Para qué sirve |
|---------|----------------|
| `pedidoId` | **PK + FK → pedidos.id** con `ON DELETE CASCADE`. Es PK porque solo puede haber **una factura por pedido**. |
| `rfc` | RFC del cliente (13 caracteres para personas físicas, 12 para morales). |
| `razonSocial` | Nombre o razón social como aparece en el SAT. |
| `regimenFiscal` | Código numérico del régimen fiscal SAT (`'601'` General Personas Morales, `'612'` Personas Físicas con Actividad Empresarial, etc.). |
| `usoCFDI` | Uso del CFDI según catálogo SAT (`'G01'` Adquisición de mercancías, `'G03'` Gastos en general, etc.). |
| `domicilioFiscal` | Código postal del domicilio fiscal. |
| `createdAt` | Fecha en que se solicitó la factura. |

**Cómo se usa en el sistema:**
- En `/pago` aparece un checkbox "¿Requieres factura?". Si lo activa, llena estos datos.
- Al crear el pedido, si la factura existe, se inserta aquí. Si no, esta tabla queda vacía para ese `pedidoId`.
- Al descargar el recibo desde `/pedido/:id`, el sistema verifica si hay factura: si sí → CFDI personalizado; si no → CFDI público en general.

---

## 8️⃣ Tabla `tickets` — Sistema de soporte

> **Propósito:** Tickets de atención al cliente. Funciona como un sistema de mesa de ayuda básico.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Número del ticket ("Ticket #1"). |
| `userId` | **FK → usuarios.id**, `NULL`-able. Si el usuario se borra, su ticket conserva la info (`ON DELETE SET NULL`). También permite tickets de invitados (sin cuenta). |
| `userEmail` | Email para responder. Se guarda aquí para conservar el dato aunque el usuario cambie su correo. |
| `userName` | Nombre del que abrió el ticket. Igual: snapshot histórico. |
| `subject` | Asunto del ticket ("Mi paquete no llega"). |
| `message` | Mensaje inicial del cliente. |
| `status` | Estado: `'open'`, `'in_progress'`, `'resolved'`, `'closed'`. |
| `priority` | Prioridad: `'low'`, `'normal'`, `'high'`, `'urgent'`. Para que el admin sepa cuál atender primero. |
| `createdAt` | Cuándo se abrió. |
| `updatedAt` | Cuándo se actualizó por última vez (cambio de estado, respuesta, etc.). |

**Cómo se usa en el sistema:**
- En `/soporte` el cliente crea tickets y ve los suyos
- En `/admin` → tab Tickets el admin ve TODOS y puede responder, cambiar estado o prioridad
- Al crear se envía un email automático al cliente (confirmación) y al admin (notificación)

---

## 9️⃣ Tabla `ticket_replies` — Conversación del ticket

> **Propósito:** Cada vez que el cliente o el admin escribe algo en un ticket, se guarda como una respuesta. Forma el hilo de conversación.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador de la respuesta. |
| `ticketId` | **FK → tickets.id** con `ON DELETE CASCADE`. Si se borra el ticket, sus respuestas se borran. |
| `fromAdmin` | Bandera (`0` o `1`). Define quién escribió: cliente (0) o admin (1). El frontend pinta cada burbuja de chat de diferente color según esto. |
| `authorName` | Nombre visible ("Soporte Natureza" o el nombre del cliente). |
| `message` | Texto de la respuesta. |
| `createdAt` | Cuándo se envió. Sirve para ordenar el hilo cronológicamente. |

**Cómo se usa en el sistema:**
- Cuando el admin responde, se inserta una fila con `fromAdmin=1` y se envía email al cliente
- El cliente ve las respuestas en orden, una debajo de la otra
- El timestamp `updatedAt` del ticket padre se actualiza con cada respuesta

---

## 🔟 Tabla `password_reset_tokens` — Recuperación de contraseña

> **Propósito:** Cuando un usuario olvida su contraseña, se genera un token único que se envía por email. Esta tabla lo guarda hasta que se usa o expira.

| Columna | Para qué sirve |
|---------|----------------|
| `id` | Identificador interno. |
| `userId` | **FK → usuarios.id**. A qué usuario pertenece el token. |
| `token` | Cadena aleatoria criptográfica de 64 caracteres (32 bytes en hex). Es **única**: dos tokens nunca se repiten — eso lo garantiza la restricción `UNIQUE`. |
| `expiresAt` | Momento exacto en que expira. El sistema rechaza tokens con `expiresAt < NOW()`. Vida típica: **1 hora**. |
| `used` | Bandera (`0` o `1`). Una vez usado, no se puede volver a usar — esto previene que alguien intercepte el enlace y lo reuse. |
| `createdAt` | Cuándo se generó. |

**Cómo se usa en el sistema:**
- Cuando el usuario solicita recuperar contraseña, el backend:
  1. Marca los tokens anteriores del usuario como `used=1`
  2. Genera token nuevo aleatorio
  3. Inserta una fila aquí con `expiresAt = NOW() + 1 hour`
  4. Envía un email con el enlace `/reset-password?token=XXX`
- Cuando el usuario abre el enlace y pone nueva contraseña, el backend valida que el token exista, no esté usado y no esté expirado → actualiza contraseña + marca el token como `used=1`

---

## 🔗 Diagrama mental de relaciones

Para presentar, puedes decir:

> "El sistema gira alrededor de la tabla **usuarios**. Desde ahí, cada usuario puede tener varias **direcciones** (1:N), hacer varios **pedidos** (1:N), crear varios **tickets** (1:N) y solicitar tokens de recuperación de contraseña.
>
> Cada **pedido** se conecta con un **usuario**, una **dirección**, una **opción de envío** y tiene varias líneas en **pedido_detalle** (que apuntan a **productos**). Opcionalmente, un pedido puede tener un registro en **pedido_factura** si se solicitó factura.
>
> Los **productos** son referenciados por las líneas de pedido, pero su precio se guarda como snapshot histórico para no perderlo si cambia.
>
> Los **tickets** tienen sus propias respuestas en **ticket_replies** que forman el hilo de conversación."

---

## 🧠 Decisiones técnicas que vale la pena mencionar

| Decisión | Por qué |
|----------|---------|
| **Llaves foráneas con `ON DELETE CASCADE`** (`pedido_detalle` → `pedidos`, `ticket_replies` → `tickets`, `pedido_factura` → `pedidos`) | Garantiza limpieza: si se borra el padre, los hijos también se van. No quedan huérfanos. |
| **`ON DELETE SET NULL`** en `pedidos.direccionId` y `tickets.userId` | Permite borrar direcciones o usuarios sin perder el historial del pedido o ticket. |
| **`UNIQUE` en `email` (usuarios) y `token` (reset)** | Garantiza identidad única a nivel BD, no solo en código. |
| **`DECIMAL(10,2)` para dinero** | Evita errores de coma flotante. Nunca usar `FLOAT` para precios. |
| **`TIMESTAMP` con `default CURRENT_TIMESTAMP`** | Auditoría automática sin código extra. |
| **JSON en `trackingHistoryJson`** | Permite estructura flexible (array de eventos) sin necesitar una tabla extra. Es aceptable para datos auxiliares; los datos críticos sí están en tablas normalizadas. |
| **Snapshot histórico de precio en `pedido_detalle.precio`** | El precio puede cambiar, pero el pedido debe conservar lo que el cliente pagó. |
| **Sin `username`, solo `email`** | Un solo identificador, menos confusión, más fácil de implementar recuperación. |
| **`isAdmin` como `TINYINT(1)` (boolean)** | Sistema de roles simple — solo dos roles (cliente y admin). Si en el futuro se necesitan más roles, se migra a una tabla `roles`. |

---

## 🗣️ Frases listas para usar en presentación

> "Esta base de datos está **normalizada en 3FN**: no hay datos redundantes, cada relación se hace por ID."

> "La tabla `usuarios` es el punto de entrada — su `id` es el que viaja en todo el sistema. Lo encontrarás en `direcciones.userId`, `pedidos.userId`, `tickets.userId` y `password_reset_tokens.userId`."

> "El precio del producto se guarda **dos veces a propósito**: una en `productos.price` (precio actual) y otra en `pedido_detalle.precio` (precio histórico). Esto se llama **snapshot pattern** y es esencial en e-commerce para que el pedido nunca cambie aunque cambien los precios."

> "Las opciones de envío están en su propia tabla aunque solo haya dos filas, porque el día que quieran agregar 'FedEx' o 'Estafeta' es agregar una fila — no tocar código."

> "Las contraseñas se guardan como **hash bcrypt**, no en texto plano. Aunque alguien robe la base de datos, las contraseñas reales son indescifrables."

> "El sistema usa **transacciones SQL atómicas** al procesar un pago: bloquea el producto con `SELECT ... FOR UPDATE`, valida stock, descuenta unidades e inserta el pedido — todo o nada. Si algo falla, se hace `ROLLBACK` y no queda ningún dato a medias."

---

**Fin. Con esta explicación puedes defender cada decisión de diseño y cada columna sin titubear.**
