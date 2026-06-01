import { Injectable, signal, computed, inject } from '@angular/core';
import { CarritoService } from './carrito.service';
import { ShippingOption } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class EnvioService {
  private carritoService = inject(CarritoService);

  private _opcionSeleccionada = signal<ShippingOption | null>(null);

  /** Opción de envío seleccionada por el usuario (readonly) */
  opcionSeleccionada = this._opcionSeleccionada.asReadonly();

  /**
   * Opciones de envío disponibles, recalculadas reactivamente
   * cuando cambia el subtotal del carrito.
   *
   * Reglas de precio:
   *   subtotal <  $500  → Estándar $99  | Express $199
   *   subtotal >= $500  → Estándar GRATIS | Express $149
   *   subtotal >= $1000 → Estándar GRATIS | Express GRATIS
   */
  opciones = computed(() => this._calcularOpciones(this.carritoService.total()));

  /**
   * Costo de envío vigente para la opción seleccionada.
   * Se recalcula si el carrito cambia (ej. el envío pasó a ser gratis).
   */
  costoEnvio = computed(() => {
    const sel = this._opcionSeleccionada();
    if (!sel) return 0;
    // Buscar el costo actualizado según el subtotal actual
    const actual = this.opciones().find(o => o.id === sel.id);
    return actual?.cost ?? 0;
  });

  // ─────────────────────────────────────────────────────────────────────────

  /** Selecciona una opción de envío */
  seleccionar(opcion: ShippingOption): void {
    this._opcionSeleccionada.set(opcion);
  }

  /**
   * Genera un número de guía con formato:
   *   MX-{EST|EXP}-{YYYYMMDD}-{6 chars aleatorios}
   * Ejemplo: MX-EST-20260422-A7K3PQ
   */
  generarTracking(): string {
    const now = new Date();
    const fecha =
      `${now.getFullYear()}` +
      `${String(now.getMonth() + 1).padStart(2, '0')}` +
      `${String(now.getDate()).padStart(2, '0')}`;
    const carrierId = this._opcionSeleccionada()?.id === 'express' ? 'EXP' : 'EST';
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MX-${carrierId}-${fecha}-${rand}`;
  }

  /** Resetea la selección (llamar al vaciar el carrito o cancelar el pago) */
  resetear(): void {
    this._opcionSeleccionada.set(null);
  }

  // ─────────────────────────────────────────────────────────────────────────

  private _calcularOpciones(subtotal: number): ShippingOption[] {
    const base: Omit<ShippingOption, 'cost'>[] = [
      {
        id: 'estandar',
        label: 'Envío Estándar',
        carrier: 'Correos de México',
        estimatedDays: 7,
      },
      {
        id: 'express',
        label: 'Envío Express',
        carrier: 'DHL',
        estimatedDays: 3,
      },
    ];

    return base.map(op => {
      let cost: number;
      if (subtotal >= 1000) {
        cost = 0;
      } else if (subtotal >= 500) {
        cost = op.id === 'estandar' ? 0 : 149;
      } else {
        cost = op.id === 'estandar' ? 99 : 199;
      }
      return { ...op, cost } as ShippingOption;
    });
  }
}
