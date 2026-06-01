import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Signal } from '@angular/core';
import { CarritoService } from '../../services/carrito.service';
import { EnvioService }   from '../../services/envio.service';
import { CartItem }       from '../../models/producto.model';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';

@Component({
  selector: 'app-carrito-page',
  standalone: true,
  imports: [CurrencyPipe, SiteHeaderComponent],
  templateUrl: './carrito-page.component.html',
  styleUrls: ['./carrito-page.component.css'],
})
export class CarritoPageComponent implements OnInit {
  carritoService = inject(CarritoService);
  private envioService   = inject(EnvioService);
  private router         = inject(Router);

  carrito: Signal<CartItem[]> = this.carritoService.items;
  total      = computed(() => this.carritoService.total());
  itemCount  = computed(() => this.carritoService.itemCount());
  avisoStock = computed(() => this.carritoService.avisoStock());

  ngOnInit(): void {
    // Refrescar stock contra la BD al entrar a la página
    this.carritoService.verificarStock();
  }

  descartarAvisos(): void {
    this.carritoService.descartarAvisos();
  }

  incrementar(productId: number): void {
    const item = this.carrito().find(i => i.product.id === productId);
    if (item) this.carritoService.actualizarCantidad(productId, item.quantity + 1);
  }

  decrementar(productId: number): void {
    const item = this.carrito().find(i => i.product.id === productId);
    if (item && item.quantity > 1) {
      this.carritoService.actualizarCantidad(productId, item.quantity - 1);
    }
  }

  quitar(id: number): void {
    this.carritoService.quitar(id);
    // Si el carrito queda vacío, también limpiar la selección de envío
    if (this.carritoService.items().length === 0) {
      this.envioService.resetear();
    }
  }

  vaciar(): void {
    this.carritoService.vaciar();
    // Limpiar selección de envío: ya no hay nada que enviar
    this.envioService.resetear();
  }

  volver(): void      { this.router.navigate(['/']); }
  irACheckout(): void { this.router.navigate(['/pago']); }
  verProducto(id: number): void { this.router.navigate(['/producto', id]); }
}
