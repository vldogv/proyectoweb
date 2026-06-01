import {
  Injectable,
  signal,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Order, PaymentMethod, FacturaData } from '../models/user.model';
import { CarritoService }  from './carrito.service';
import { EnvioService }    from './envio.service';
import { OrderService }    from './order.service';
import { AddressService }  from './address.service';

const API = 'http://localhost:4000/api';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type EstadoPago =
  | 'idle'
  | 'procesando'
  | 'exito'
  | 'error';

export type ErrorPago =
  | 'sin_direccion'
  | 'sin_envio'
  | 'carrito_vacio'
  | 'pago_rechazado'
  | 'paypal_error'
  | null;

// ─── Servicio ─────────────────────────────────────────────────────────────────

/**
 * PagoService — orquestador del flujo de pago.
 *
 * Soporta dos métodos:
 *   - 'card_simulated' → simulación local (90 % éxito tras 2.5 s)
 *   - 'paypal'         → flujo SDK embebido:
 *                          1. PagoComponent llama crearOrdenPaypal() → devuelve paypalOrderId
 *                          2. SDK muestra popup; al aprobar llama capturarPaypal(orderId)
 *                          3. capturarPaypal() llama al backend y crea el pedido en BD
 */
@Injectable({ providedIn: 'root' })
export class PagoService {
  private platformId     = inject(PLATFORM_ID);
  private http           = inject(HttpClient);
  private carritoService = inject(CarritoService);
  private envioService   = inject(EnvioService);
  private orderService   = inject(OrderService);
  private addressService = inject(AddressService);

  private _estado       = signal<EstadoPago>('idle');
  private _error        = signal<ErrorPago>(null);
  private _pedidoCreado = signal<Order | null>(null);

  estado       = this._estado.asReadonly();
  error        = this._error.asReadonly();
  pedidoCreado = this._pedidoCreado.asReadonly();

  // ═══════════════════════════════════════════════════════════════════════
  //  API pública — tarjeta simulada
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Inicia el pago con tarjeta simulada.
   * Para PayPal usa crearOrdenPaypal() + capturarPaypal() desde el componente.
   */
  procesarPago(metodo: PaymentMethod): void {
    if (this.carritoService.items().length === 0) return this._setError('carrito_vacio');
    if (!this.addressService.defaultAddress())    return this._setError('sin_direccion');
    if (!this.envioService.opcionSeleccionada())  return this._setError('sin_envio');

    if (isPlatformBrowser(this.platformId)) {
      if (sessionStorage.getItem('pago_en_progreso') === 'true') return;
      sessionStorage.setItem('pago_en_progreso', 'true');
    }

    this._estado.set('procesando');
    this._error.set(null);

    this._iniciarPagoSimulado(metodo);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  API pública — PayPal SDK embebido
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Paso 1 del flujo PayPal SDK.
   * Lo llama el callback createOrder del SDK (cuando el usuario hace click en el botón).
   * Devuelve el paypalOrderId que el SDK necesita para mostrar el popup.
   */
  async crearOrdenPaypal(): Promise<string> {
    const items           = this.carritoService.items();
    const shippingAddress = this.addressService.defaultAddress();
    const shippingOption  = this.envioService.opcionSeleccionada();

    if (!items.length || !shippingAddress || !shippingOption) {
      throw new Error('Datos de pago incompletos: verifica dirección y envío');
    }

    const res = await firstValueFrom(
      this.http.post<{ paypalOrderId: string }>(
        `${API}/paypal/create-order`,
        { items, shippingAddress, shippingOption }
      )
    );
    return res.paypalOrderId;
  }

  /**
   * Paso 2 del flujo PayPal SDK.
   * Lo llama el callback onApprove del SDK después de que el usuario aprueba.
   * Captura el pago, crea el pedido en BD y actualiza el estado.
   * @param factura  Opcional: datos fiscales para CFDI personalizado
   */
  async capturarPaypal(paypalOrderId: string, factura: FacturaData | null = null): Promise<void> {
    this._estado.set('procesando');
    this._error.set(null);

    try {
      const items           = this.carritoService.items();
      const shippingAddress = this.addressService.defaultAddress()!;
      const shippingOption  = this.envioService.opcionSeleccionada()!;

      const res = await firstValueFrom(
        this.http.post<{ order: any }>(
          `${API}/paypal/capture-order/${paypalOrderId}`,
          { items, shippingAddress, shippingOption, factura }
        )
      );

      const order = this._mapOrder(res.order);
      this._pedidoCreado.set(order);
      this._estado.set('exito');

      this.carritoService.vaciar();
      this.envioService.resetear();

      // Sincronizar el historial de pedidos del usuario con el nuevo pedido
      this.orderService.loadUserOrders();

      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.removeItem('pago_en_progreso');
      }

    } catch (err) {
      console.error('Error capturando pago PayPal:', err);
      this._setError('pago_rechazado');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Control de estado
  // ═══════════════════════════════════════════════════════════════════════

  reintentar(): void {
    this._estado.set('idle');
    this._error.set(null);
  }

  resetear(): void {
    this._estado.set('idle');
    this._error.set(null);
    this._pedidoCreado.set(null);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('pago_en_progreso');
    }
  }

  getErrorMessage(): string {
    const msgs: Record<NonNullable<ErrorPago>, string> = {
      sin_direccion:  'No tienes una dirección de envío guardada. Agrégala en "Mi cuenta" antes de pagar.',
      sin_envio:      'Selecciona un método de envío antes de continuar.',
      carrito_vacio:  'Tu carrito está vacío.',
      pago_rechazado: 'No pudimos procesar tu pago. Verifica tus datos e inténtalo nuevamente.',
      paypal_error:   'Ocurrió un problema con PayPal. Vuelve a intentarlo.',
    };
    const e = this._error();
    return e ? msgs[e] : '';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Internos
  // ═══════════════════════════════════════════════════════════════════════

  private _iniciarPagoSimulado(metodo: PaymentMethod): void {
    setTimeout(async () => {
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.removeItem('pago_en_progreso');
      }
      const esExito = Math.random() > 0.1;
      if (esExito) {
        await this._confirmarPagoSimulado(metodo);
      } else {
        this._setError('pago_rechazado');
      }
    }, 2500);
  }

  private async _confirmarPagoSimulado(metodo: PaymentMethod): Promise<void> {
    const address     = this.addressService.defaultAddress()!;
    const opcionEnvio = this.envioService.opcionSeleccionada()!;
    const tracking    = this.envioService.generarTracking();
    const paymentId   = 'SIM-' + Date.now().toString(36).toUpperCase();

    const pedido = await this.orderService.createOrder({
      shippingAddress: address,
      shippingOption:  opcionEnvio,
      shippingCost:    this.envioService.costoEnvio(),
      trackingNumber:  tracking,
      paymentMethod:   metodo,
      paymentId,
    });

    if (!pedido) {
      this._setError('pago_rechazado');
      return;
    }

    this._pedidoCreado.set(pedido);
    this._estado.set('exito');
    this.carritoService.vaciar();
    this.envioService.resetear();
  }

  private _setError(code: NonNullable<ErrorPago>): void {
    this._error.set(code);
    this._estado.set('error');
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('pago_en_progreso');
    }
  }

  private _mapOrder(raw: any): Order {
    return {
      id:              raw.id?.toString() ?? '',
      userId:          raw.userId,
      items:           raw.items ?? [],
      subtotal:        parseFloat(raw.subtotal) || 0,
      total:           parseFloat(raw.total) || 0,
      status:          raw.status ?? 'pending',
      shippingAddress: raw.shippingAddress ?? {},
      createdAt:       new Date(raw.createdAt),
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
      factura:         raw.factura ?? null,
    };
  }
}
