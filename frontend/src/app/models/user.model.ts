export interface User {
  id: number;
  fullName: string;
  email: string;
  password?: string;
  isAdmin?: boolean;
  createdAt?: Date;
}

export interface Address {
  id: number;
  userId: number;
  label: string;
  fullName: string;
  street: string;
  city: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

// ─── Pago ────────────────────────────────────────────────────────────────────

/** Método de pago utilizado en el checkout */
export type PaymentMethod = 'card_simulated' | 'paypal';

/** Estado del proceso de pago en tiempo real */
export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

/** Registro de un intento de pago */
export interface PaymentAttempt {
  /** ID único del intento (simulado o devuelto por PayPal) */
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Monto total cobrado (subtotal + envío) */
  amount: number;
  timestamp: Date;
  /** Código de error si el pago falló */
  errorCode?: string;
}

// ─── Envíos ───────────────────────────────────────────────────────────────────

/** Opción de envío disponible en el checkout */
export interface ShippingOption {
  id: string;
  /** Nombre visible: "Estándar", "Express" */
  label: string;
  carrier: string;
  estimatedDays: number;
  cost: number;
}

/** Estado del envío físico del paquete */
export type ShippingStatus =
  | 'pending'
  | 'ready'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered';

/** Evento individual en el timeline de seguimiento */
export interface TrackingEvent {
  status: ShippingStatus;
  /** Etiqueta legible: "En camino", "Recolectado por el carrier", etc. */
  label: string;
  /** Fecha estimada o real del evento */
  timestamp: Date;
  /** Ubicación opcional: "CDMX", "Guadalajara", etc. */
  location?: string;
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  userId: number;
  items: OrderItem[];
  /**
   * Subtotal del carrito (sin envío).
   * En pedidos antiguos equivale al total completo.
   */
  subtotal?: number;
  /**
   * Total final cobrado al cliente (subtotal + shippingCost).
   * En pedidos antiguos (sin envío) es igual a subtotal.
   */
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  createdAt: Date;

  // — Envío (presentes a partir del paso 2 de implementación) —
  /** Opción de envío elegida por el usuario */
  shippingOption?: ShippingOption;
  /** Costo de envío cobrado (0 si es gratis) */
  shippingCost?: number;
  /** Número de guía generado al confirmar el pedido */
  trackingNumber?: string;
  /** Estado actual del envío físico */
  shippingStatus?: ShippingStatus;
  /** Historial de eventos del envío */
  trackingHistory?: TrackingEvent[];

  // — Pago (presentes a partir del paso 4 de implementación) —
  /** Método de pago utilizado */
  paymentMethod?: PaymentMethod;
  /** ID del intento de pago (simulado o de PayPal) */
  paymentId?: string;

  /** Datos fiscales si el usuario solicitó factura personalizada */
  factura?: FacturaData | null;
}

/** Datos fiscales opcionales del CFDI personalizado */
export interface FacturaData {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCFDI: string;
  domicilioFiscal: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
