import { Component, computed, Input, Output, EventEmitter } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { CartItem } from '../../models/producto.model';
import { Signal } from '@angular/core';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css'],
})
export class CarritoComponent {
  @Input() isOverlay = true;
  @Output() closeCart = new EventEmitter<void>();

  carrito: Signal<CartItem[]>;
  total = computed(() => this.carritoService.total());
  itemCount = computed(() => this.carritoService.itemCount());
  avisoStock = computed(() => this.carritoService.avisoStock());

  constructor(
    public carritoService: CarritoService,
    private router: Router
  ) {
    this.carrito = this.carritoService.items;
  }

  descartarAvisos() {
    this.carritoService.descartarAvisos();
  }

  incrementar(productId: number) {
    const item = this.carrito().find(i => i.product.id === productId);
    if (item) {
      this.carritoService.actualizarCantidad(productId, item.quantity + 1);
    }
  }

  decrementar(productId: number) {
    const item = this.carrito().find(i => i.product.id === productId);
    if (item && item.quantity > 1) {
      this.carritoService.actualizarCantidad(productId, item.quantity - 1);
    }
  }

  quitar(id: number) {
    this.carritoService.quitar(id);
  }

  vaciar() {
    this.carritoService.vaciar();
  }

  irACheckout() {
    this.closeCart.emit();
    this.router.navigate(['/pago']);
  }

  verCarritoCompleto() {
    this.closeCart.emit();
    this.router.navigate(['/carrito']);
  }
}
