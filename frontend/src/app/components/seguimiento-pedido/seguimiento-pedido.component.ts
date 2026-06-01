import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { CfdiService } from '../../services/cfdi.service';
import { Order, ShippingStatus, TrackingEvent } from '../../models/user.model';

@Component({
  selector: 'app-seguimiento-pedido',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgClass],
  templateUrl: './seguimiento-pedido.component.html',
  styleUrls: ['./seguimiento-pedido.component.css'],
})
export class SeguimientoPedidoComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cfdiService = inject(CfdiService);
  orderService       = inject(OrderService);

  pedido   = signal<Order | null>(null);
  copiado  = signal(false);
  cargando = signal(true);

  // ─── Pasos del envío (orden exacto de ShippingStatus) ────────────────────
  readonly pasosEnvio: { id: ShippingStatus; etiqueta: string }[] = [
    { id: 'pending',          etiqueta: 'Confirmado'  },
    { id: 'ready',            etiqueta: 'Preparando'  },
    { id: 'picked_up',        etiqueta: 'Recolectado' },
    { id: 'in_transit',       etiqueta: 'En camino'   },
    { id: 'out_for_delivery', etiqueta: 'En reparto'  },
    { id: 'delivered',        etiqueta: 'Entregado'   },
  ];

  private readonly ordenEnvio: ShippingStatus[] = this.pasosEnvio.map(p => p.id);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.cargando.set(false); return; }

    // Siempre cargar desde el backend para garantizar datos frescos
    const order = await this.orderService.loadOrderById(id);
    this.pedido.set(order);
    this.cargando.set(false);
  }

  // ─── Helpers de envío (shippingStatus) ───────────────────────────────────

  isEnvioCompletado(statusId: ShippingStatus): boolean {
    const order = this.pedido();
    if (!order?.shippingStatus) return statusId === 'pending';
    return (
      this.ordenEnvio.indexOf(statusId) <=
      this.ordenEnvio.indexOf(order.shippingStatus)
    );
  }

  isEnvioActual(statusId: ShippingStatus): boolean {
    return this.pedido()?.shippingStatus === statusId;
  }

  /** Devuelve el evento del historial correspondiente a un estado, si existe */
  getEventoHistorial(status: ShippingStatus): TrackingEvent | undefined {
    return this.pedido()?.trackingHistory?.find(e => e.status === status);
  }

  getShippingLabel(status: ShippingStatus): string {
    return this.orderService.getShippingStatusLabel(status);
  }

  getShippingColor(status: ShippingStatus): string {
    return this.orderService.getShippingStatusColor(status);
  }

  // ─── Helpers de estado de pedido (order.status) ───────────────────────────

  getStatusLabel(status: Order['status']): string {
    return this.orderService.getStatusLabel(status);
  }

  getStatusColor(status: Order['status']): string {
    return this.orderService.getStatusColor(status);
  }

  // ─── Fecha estimada de entrega ────────────────────────────────────────────

  get fechaEstimadaEntrega(): Date | null {
    const order = this.pedido();
    if (!order?.shippingOption) return null;
    const d = new Date(order.createdAt);
    d.setDate(d.getDate() + order.shippingOption.estimatedDays);
    return d;
  }

  // ─── Totales del sidebar ──────────────────────────────────────────────────

  get subtotalPedido(): number {
    const order = this.pedido();
    if (!order) return 0;
    // Compatibilidad: pedidos antiguos sin subtotal usan total
    return order.subtotal ?? order.total;
  }

  get costoPedido(): number {
    return this.pedido()?.shippingCost ?? 0;
  }

  // ─── Copiar número de guía ────────────────────────────────────────────────

  copiarTracking(): void {
    const num = this.pedido()?.trackingNumber;
    if (!num || !isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(num).catch(() => {});
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  // ─── Método de pago ───────────────────────────────────────────────────────

  get labelMetodoPago(): string {
    const m = this.pedido()?.paymentMethod;
    if (!m) return '—';
    return m === 'paypal' ? 'PayPal' : 'Tarjeta';
  }

  // ─── Navegación ───────────────────────────────────────────────────────────

  /** Genera y descarga el CFDI 4.0 (XML) con los datos del pedido */
  imprimirRecibo(): void {
    const pedido = this.pedido();
    if (!pedido) return;

    // Construye los conceptos en formato CartItem para reutilizar el servicio CFDI
    const conceptos = pedido.items.map(i => ({
      product: {
        id:          i.productId,
        name:        i.productName,
        price:       i.unitPrice,
        imageUrl:    i.productImage ?? '',
        category:    '',
        description: '',
        inStock:     true,
        stock:       0,
      },
      quantity: i.quantity,
    }));

    // Usar datos fiscales del pedido si el cliente solicitó factura personalizada
    const f = pedido.factura;
    const receptor = f
      ? {
          rfc:                     f.rfc,
          nombre:                  f.razonSocial,
          domicilioFiscalReceptor: f.domicilioFiscal,
          regimenFiscalReceptor:   f.regimenFiscal,
          usoCFDI:                 f.usoCFDI,
        }
      : {
          rfc:                     'XAXX010101000',  // Público en general
          nombre:                  pedido.shippingAddress?.fullName || 'Publico en General',
          domicilioFiscalReceptor: pedido.shippingAddress?.postalCode || '00000',
          regimenFiscalReceptor:   '616',
          usoCFDI:                 'S01',
        };

    const xml = this.cfdiService.generateCFDI40({
      emisor: {
        rfc: 'NAT010101AAA',
        nombre: 'Natureza S.A. de C.V.',
        regimenFiscal: '601',
      },
      receptor,
      conceptos,
      formaPago:         '04',
      metodoPago:        'PUE',
      moneda:            'MXN',
      tipoDeComprobante: 'I',
      exportacion:       '01',
      lugarExpedicion:   pedido.shippingAddress?.postalCode || '00000',
    });

    this.cfdiService.downloadCFDI(xml, `CFDI_Pedido_${pedido.id}.xml`);
  }

  volver(): void         { this.router.navigate(['/cuenta']); }
}
