import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  signal,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarritoService }        from '../../services/carrito.service';
import { EnvioService }          from '../../services/envio.service';
import { PagoService }           from '../../services/pago.service';
import { PaypalSdkService }      from '../../services/paypal-sdk.service';
import { AddressService }        from '../../services/address.service';
import { Address, FacturaData }   from '../../models/user.model';
import { ResumenEnvioComponent } from './resumen-envio/resumen-envio.component';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, NgClass, ResumenEnvioComponent],
  templateUrl: './pago.component.html',
  styleUrls: ['./pago.component.css'],
})
export class PagoComponent implements OnInit, OnDestroy, AfterViewChecked {

  // ── Servicios ─────────────────────────────────────────────────────────────
  carritoService   = inject(CarritoService);
  envioService     = inject(EnvioService);
  pagoService      = inject(PagoService);
  addressService   = inject(AddressService);
  private paypalSdk = inject(PaypalSdkService);
  private router   = inject(Router);

  // ── Referencia al contenedor de botones PayPal ────────────────────────────
  @ViewChild('paypalButtonContainer') paypalButtonContainer?: ElementRef<HTMLElement>;

  // ── Estado de UI ──────────────────────────────────────────────────────────
  metodoPago = signal<'tarjeta' | 'paypal'>('tarjeta');

  /** Evita renderizar los botones más de una vez por ciclo */
  private _paypalRendered = false;

  /** Señal para mostrar spinner mientras PayPal captura el pago */
  sdkCapturando = signal(false);

  // ── Dirección de envío ────────────────────────────────────────────────────
  /** Modo: seleccionar una existente o crear nueva */
  modoDireccion = signal<'seleccionar' | 'nueva'>('seleccionar');
  guardandoDireccion = signal(false);

  /** Form para crear nueva dirección */
  nuevaDireccion: Partial<Address> = {
    label: 'Casa', fullName: '', street: '', city: '',
    postalCode: '', phone: '', isDefault: true,
  };

  // ── Factura CFDI personalizada (opcional) ─────────────────────────────────
  requiereFactura = signal(false);
  facturaForm: FacturaData = {
    rfc: '', razonSocial: '', regimenFiscal: '601',
    usoCFDI: 'G03', domicilioFiscal: '',
  };
  readonly regimenesFiscales = [
    { value: '601', label: '601 — General de Ley Personas Morales' },
    { value: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
    { value: '605', label: '605 — Sueldos y Salarios' },
    { value: '606', label: '606 — Arrendamiento' },
    { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
    { value: '621', label: '621 — Incorporación Fiscal' },
    { value: '626', label: '626 — Régimen Simplificado de Confianza (RESICO)' },
  ];
  readonly usosCFDI = [
    { value: 'G01', label: 'G01 — Adquisición de mercancías' },
    { value: 'G03', label: 'G03 — Gastos en general' },
    { value: 'P01', label: 'P01 — Por definir' },
    { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  ];

  // Formulario tarjeta
  titularTarjeta  = signal('');
  numeroTarjeta   = signal('');
  fechaExpiracion = signal('');
  cvv             = signal('');

  // ── Totales reactivos ─────────────────────────────────────────────────────
  get items()  { return this.carritoService.items; }
  subtotal     = computed(() => this.carritoService.total());
  total        = computed(() => this.subtotal() + this.envioService.costoEnvio());

  // ── Validaciones ──────────────────────────────────────────────────────────
  get formTarjetaValido(): boolean {
    return (
      this.titularTarjeta().trim().length > 3 &&
      this.numeroTarjeta().replace(/\s/g, '').length === 16 &&
      this.fechaExpiracion().length === 5 &&
      this.cvv().length >= 3
    );
  }

  get puedePagar(): boolean {
    return this.formTarjetaValido
        && this.carritoService.items().length > 0
        && this.addressService.defaultAddress() !== null
        && this.envioService.opcionSeleccionada() !== null
        // Si hay avisos de stock sin revisar, el usuario debe descartarlos primero
        && this.carritoService.avisoStock().length === 0;
  }

  /** ¿Hay avisos de stock pendientes que bloquean el pago? */
  get hayAvisosStock(): boolean {
    return this.carritoService.avisoStock().length > 0;
  }

  // ── Dirección — métodos ──────────────────────────────────────────────────

  get nuevaDireccionValida(): boolean {
    const d = this.nuevaDireccion;
    return !!(d.fullName?.trim() && d.street?.trim() &&
              d.city?.trim() && d.postalCode?.trim() && d.phone?.trim());
  }

  get facturaValida(): boolean {
    if (!this.requiereFactura()) return true;
    const f = this.facturaForm;
    // RFC: 12 (moral) o 13 (física) caracteres
    const rfcValido = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i.test(f.rfc.trim());
    return rfcValido && !!f.razonSocial.trim() && !!f.domicilioFiscal.trim();
  }

  /** Devuelve los datos de factura si el usuario los pidió (para enviar al backend) */
  getFacturaPayload(): FacturaData | null {
    if (!this.requiereFactura() || !this.facturaValida) return null;
    return {
      ...this.facturaForm,
      rfc: this.facturaForm.rfc.trim().toUpperCase(),
    };
  }

  async seleccionarDireccion(id: number): Promise<void> {
    await this.addressService.setAsDefault(id);
  }

  async guardarNuevaDireccion(): Promise<void> {
    if (!this.nuevaDireccionValida) return;
    this.guardandoDireccion.set(true);
    try {
      const created = await this.addressService.addAddress({
        label:      this.nuevaDireccion.label!     ?? 'Casa',
        fullName:   this.nuevaDireccion.fullName!,
        street:     this.nuevaDireccion.street!,
        city:       this.nuevaDireccion.city!,
        postalCode: this.nuevaDireccion.postalCode!,
        phone:      this.nuevaDireccion.phone!,
        isDefault:  true,
      });
      if (created) {
        this.nuevaDireccion = {
          label: 'Casa', fullName: '', street: '', city: '',
          postalCode: '', phone: '', isDefault: true,
        };
        this.modoDireccion.set('seleccionar');
      }
    } finally {
      this.guardandoDireccion.set(false);
    }
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.pagoService.resetear();
    // Refrescar stock contra la BD: avisa al usuario si algo cambió mientras navegaba
    this.carritoService.verificarStock();
    this.addressService.loadAddresses().then(() => {
      // Si no hay direcciones, abre el formulario nuevo por defecto
      if (this.addressService.userAddresses().length === 0) {
        this.modoDireccion.set('nueva');
      }
    });
  }

  descartarAvisosStock(): void {
    this.carritoService.descartarAvisos();
  }

  ngOnDestroy(): void {
    if (this.pagoService.estado() === 'procesando') {
      this.pagoService.resetear();
    }
  }

  /**
   * Se ejecuta después de cada ciclo de detección de cambios.
   * Cuando el tab de PayPal está visible y el contenedor aparece en el DOM,
   * renderiza los botones una sola vez.
   */
  ngAfterViewChecked(): void {
    if (
      this.metodoPago() === 'paypal' &&
      !this._paypalRendered &&
      this.paypalButtonContainer?.nativeElement
    ) {
      this._paypalRendered = true;
      this._renderPaypalButtons();
    }

    // Si el usuario cambia a tarjeta, permitir re-render al volver a PayPal
    if (this.metodoPago() === 'tarjeta') {
      this._paypalRendered = false;
    }
  }

  // ── Renderizado SDK PayPal ────────────────────────────────────────────────

  private _renderPaypalButtons(): void {
    const container = this.paypalButtonContainer?.nativeElement;
    if (!container) return;

    this.paypalSdk
      .renderButtons(container, {
        createOrder: () => this.pagoService.crearOrdenPaypal(),

        onApprove: async (data) => {
          this.sdkCapturando.set(true);
          try {
            await this.pagoService.capturarPaypal(data.orderID, this.getFacturaPayload());
          } finally {
            this.sdkCapturando.set(false);
          }
        },

        onError: (err) => {
          console.error('[PayPal SDK] Error en botones:', err);
          this.pagoService['_setError']('paypal_error');
        },

        onCancel: () => {
          console.log('[PayPal SDK] Pago cancelado');
        },
      })
      .catch((err) => {
        console.error('[PaypalSdkService] renderButtons falló:', err);
        this.pagoService['_setError']('paypal_error');
      });
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  procesarPago(): void {
    if (!this.puedePagar) return;
    this.pagoService.procesarPago('card_simulated');
  }

  reintentar(): void {
    this._paypalRendered = false;
    this.pagoService.reintentar();
  }

  verPedido(): void {
    const pedido = this.pagoService.pedidoCreado();
    if (pedido) this.router.navigate(['/pedido', pedido.id]);
  }

  volver(): void       { this.router.navigate(['/carrito']); }
  volverTienda(): void { this.router.navigate(['/']); }
  irACuenta(): void    { this.router.navigate(['/cuenta']); }

  // ── Formateo de inputs ────────────────────────────────────────────────────

  formatearNumeroTarjeta(event: Event): void {
    const input  = event.target as HTMLInputElement;
    let valor    = input.value.replace(/\D/g, '');
    let formateado = '';
    for (let i = 0; i < valor.length; i++) {
      if (i > 0 && i % 4 === 0) formateado += ' ';
      formateado += valor[i];
    }
    this.numeroTarjeta.set(formateado.substring(0, 19));
    input.value = this.numeroTarjeta();
  }

  formatearExpiracion(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor   = input.value.replace(/\D/g, '');
    if (valor.length >= 2) valor = valor.substring(0, 2) + '/' + valor.substring(2, 4);
    this.fechaExpiracion.set(valor.substring(0, 5));
    input.value = this.fechaExpiracion();
  }
}
