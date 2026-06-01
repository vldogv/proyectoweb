import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Order,
  OrderItem,
  OrderStatus,
  Address,
  ShippingOption,
  ShippingStatus,
  TrackingEvent,
  PaymentMethod,
} from '../models/user.model';
import { AuthService }    from './auth.service';
import { CarritoService } from './carrito.service';

const API = 'http://localhost:4000/api';

// ─── DTO de creación ──────────────────────────────────────────────────────────

/** Payload completo para crear un pedido confirmado tras un pago exitoso */
export interface CreateOrderPayload {
  /** Dirección de entrega elegida por el usuario */
  shippingAddress: Address;
  /** Opción de envío seleccionada en el checkout */
  shippingOption?: ShippingOption;
  /** Costo de envío cobrado (0 si es gratis) */
  shippingCost?: number;
  /** Número de guía generado por EnvioService */
  trackingNumber?: string;
  /** Método de pago utilizado */
  paymentMethod?: PaymentMethod;
  /** ID del intento de pago (simulado o de PayPal) */
  paymentId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OrderService {
  private platformId     = inject(PLATFORM_ID);
  private http           = inject(HttpClient);
  private authService    = inject(AuthService);
  private carritoService = inject(CarritoService);

  private ordersSignal = signal<Order[]>([]);

  /** Pedidos del usuario actual, ordenados del más reciente al más antiguo */
  userOrders = computed(() =>
    [...this.ordersSignal()].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Cargar/limpiar pedidos cada vez que cambie el usuario autenticado
      effect(() => {
        const user = this.authService.currentUser();
        if (user) {
          this.loadUserOrders();
        } else {
          this.ordersSignal.set([]);
        }
      });
    }
  }

  // ─── Carga inicial ────────────────────────────────────────────────────────

  async loadUserOrders(): Promise<void> {
    try {
      const raw = await firstValueFrom(
        this.http.get<any[]>(`${API}/pedidos/mis-pedidos`)
      );
      this.ordersSignal.set(raw.map(this._mapOrder));
    } catch {
      this.ordersSignal.set([]);
    }
  }

  // ─── Creación ─────────────────────────────────────────────────────────────

  /**
   * Crea un pedido confirmado a partir del estado actual del carrito.
   * Llama al backend y actualiza el signal con el pedido devuelto.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order | null> {
    const cartItems = this.carritoService.items();
    if (cartItems.length === 0) return null;

    try {
      const body = {
        items:          cartItems,
        shippingAddress: payload.shippingAddress,
        shippingOption:  payload.shippingOption,
        shippingCost:    payload.shippingCost ?? 0,
        trackingNumber:  payload.trackingNumber,
        paymentMethod:   payload.paymentMethod,
        paymentId:       payload.paymentId,
      };

      const raw = await firstValueFrom(
        this.http.post<any>(`${API}/pedidos/nuevo`, body)
      );
      const order = this._mapOrder(raw);
      this.ordersSignal.update(list => [order, ...list]);
      return order;
    } catch {
      return null;
    }
  }

  // ─── Consultas ────────────────────────────────────────────────────────────

  getOrderById(id: string): Order | undefined {
    return this.ordersSignal().find(o => o.id === id);
  }

  /**
   * Obtiene un pedido específico del backend y lo agrega/actualiza en el signal.
   * Útil cuando el componente de seguimiento se carga directamente por URL.
   */
  async loadOrderById(id: string): Promise<Order | null> {
    try {
      const raw = await firstValueFrom(
        this.http.get<any>(`${API}/pedidos/mis-pedidos/${id}`)
      );
      const order = this._mapOrder(raw);
      // Añadir o actualizar en el signal de caché
      this.ordersSignal.update(list => {
        const exists = list.find(o => o.id === id);
        return exists
          ? list.map(o => (o.id === id ? order : o))
          : [...list, order];
      });
      return order;
    } catch {
      return null;
    }
  }

  // ─── Actualizaciones (locales, para uso futuro) ──────────────────────────

  updateStatus(id: string, status: OrderStatus): boolean {
    const exists = this.ordersSignal().find(o => o.id === id);
    if (!exists) return false;
    this.ordersSignal.update(list =>
      list.map(o => (o.id === id ? { ...o, status } : o))
    );
    return true;
  }

  actualizarEstadoEnvio(orderId: string, status: ShippingStatus): boolean {
    const exists = this.ordersSignal().find(o => o.id === orderId);
    if (!exists) return false;

    const nuevoEvento: TrackingEvent = {
      status,
      label:     this.getShippingStatusLabel(status),
      timestamp: new Date(),
    };

    this.ordersSignal.update(list =>
      list.map(o =>
        o.id === orderId
          ? {
              ...o,
              shippingStatus:  status,
              trackingHistory: [...(o.trackingHistory ?? []), nuevoEvento],
            }
          : o
      )
    );
    return true;
  }

  // ─── Helpers de estado de pedido ─────────────────────────────────────────

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      pending:    'Pendiente',
      processing: 'Procesando',
      shipped:    'Enviado',
      delivered:  'Entregado',
      cancelled:  'Cancelado',
    };
    return labels[status];
  }

  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      pending:    '#f59e0b',
      processing: '#3b82f6',
      shipped:    '#8b5cf6',
      delivered:  '#10b981',
      cancelled:  '#ef4444',
    };
    return colors[status];
  }

  // ─── Helpers de estado de envío ──────────────────────────────────────────

  getShippingStatusLabel(status: ShippingStatus): string {
    const labels: Record<ShippingStatus, string> = {
      pending:          'Pedido confirmado',
      ready:            'Preparando tu paquete',
      picked_up:        'Recolectado por el carrier',
      in_transit:       'En camino',
      out_for_delivery: 'En reparto en tu zona',
      delivered:        'Entregado',
    };
    return labels[status];
  }

  getShippingStatusColor(status: ShippingStatus): string {
    const colors: Record<ShippingStatus, string> = {
      pending:          '#f59e0b',
      ready:            '#3b82f6',
      picked_up:        '#8b5cf6',
      in_transit:       '#06b6d4',
      out_for_delivery: '#f97316',
      delivered:        '#10b981',
    };
    return colors[status];
  }

  // ─── Mapeador de respuesta API → Order ───────────────────────────────────

  private _mapOrder(raw: any): Order {
    return {
      id:             raw.id?.toString() ?? '',
      userId:         raw.userId,
      items:          (raw.items ?? []) as OrderItem[],
      subtotal:       parseFloat(raw.subtotal) || 0,
      total:          parseFloat(raw.total) || 0,
      status:         raw.status ?? 'pending',
      shippingAddress: raw.shippingAddress ?? ({} as Address),
      createdAt:      new Date(raw.createdAt),
      shippingOption:  raw.shippingOption,
      shippingCost:    parseFloat(raw.shippingCost) || 0,
      trackingNumber:  raw.trackingNumber,
      shippingStatus:  raw.shippingStatus ?? 'pending',
      trackingHistory: (raw.trackingHistory ?? []).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })),
      paymentMethod:   raw.paymentMethod,
      paymentId:       raw.paymentId,
    };
  }
}
