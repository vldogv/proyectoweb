import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = 'http://localhost:4000/api';

export interface PaypalButtonCallbacks {
  createOrder: () => Promise<string>;
  onApprove:   (data: { orderID: string }) => Promise<void>;
  onError?:    (err: unknown) => void;
  onCancel?:   () => void;
}

/**
 * PaypalSdkService
 *
 * Responsabilidades:
 *  1. Cargar el script del SDK de PayPal una sola vez (caché de Promise).
 *  2. Renderizar los botones de PayPal en un contenedor DOM dado.
 *
 * Flujo:
 *  - loadSdk()        → obtiene clientId del backend → inyecta <script> en <head>
 *  - renderButtons()  → espera loadSdk() → llama a window.paypal.Buttons().render()
 */
@Injectable({ providedIn: 'root' })
export class PaypalSdkService {
  private platformId = inject(PLATFORM_ID);
  private http       = inject(HttpClient);

  /** Caché: se reutiliza en llamadas sucesivas a loadSdk() */
  private _sdkReady: Promise<void> | null = null;

  // ─── Cargar SDK ──────────────────────────────────────────────────────────────

  loadSdk(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    // Si ya existe la promesa (cargando o cargado), reutilizarla
    if (this._sdkReady) return this._sdkReady;

    this._sdkReady = this._doLoadSdk();
    return this._sdkReady;
  }

  private async _doLoadSdk(): Promise<void> {
    // Evitar doble inyección si el script ya existe en el DOM
    if (document.getElementById('paypal-js-sdk')) return;

    // Obtener clientId desde el backend (no exponer el secret)
    const { clientId } = await firstValueFrom(
      this.http.get<{ clientId: string }>(`${API}/paypal/config`)
    );

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id    = 'paypal-js-sdk';
      script.src   = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=MXN&intent=capture&disable-funding=card,credit,paylater`;
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal'));
      document.head.appendChild(script);
    });
  }

  // ─── Renderizar botones ───────────────────────────────────────────────────────

  /**
   * Espera a que el SDK esté listo y luego renderiza los botones
   * de PayPal dentro del contenedor HTML indicado.
   */
  async renderButtons(
    container: HTMLElement,
    callbacks: PaypalButtonCallbacks
  ): Promise<void> {
    await this.loadSdk();

    const paypal = (window as any)['paypal'];
    if (!paypal?.Buttons) {
      throw new Error('window.paypal.Buttons no está disponible');
    }

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color:  'gold',
        shape:  'rect',
        label:  'pay',
      },
      createOrder: callbacks.createOrder,
      onApprove:   callbacks.onApprove,
      onError: callbacks.onError ?? ((err: unknown) => {
        console.error('[PayPal SDK] onError', err);
      }),
      onCancel: callbacks.onCancel ?? (() => {
        console.log('[PayPal SDK] Pago cancelado por el usuario');
      }),
    }).render(container);
  }
}
