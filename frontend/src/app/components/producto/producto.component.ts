import { Component, Input, Output, EventEmitter, signal, inject, computed } from "@angular/core";
import { Product } from "../../models/producto.model";
import { CurrencyPipe } from '@angular/common';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl:'./producto.component.html',
  styleUrls:['./producto.css'],
})
export class ProductCardComponent {
  private carritoService = inject(CarritoService);

  @Input({ required: true }) product!: Product;
  @Output() add = new EventEmitter<Product>();
  @Output() viewDetails = new EventEmitter<Product>();

  addedToCart = signal(false);

  /** Cuántas unidades ya tiene el usuario en el carrito de este producto */
  get cantidadEnCarrito(): number {
    return this.carritoService.items().find(i => i.product.id === this.product.id)?.quantity ?? 0;
  }

  /** ¿Llegó al límite de stock para este producto? */
  get enLimiteStock(): boolean {
    return this.cantidadEnCarrito >= this.product.stock;
  }

  /** ¿Puede agregar al carrito? */
  get puedeAgregar(): boolean {
    return this.product.inStock && this.product.stock > 0 && !this.enLimiteStock;
  }

  onAdd(event: Event) {
    event.stopPropagation();
    if (!this.puedeAgregar) return;
    this.add.emit(this.product);
    this.addedToCart.set(true);
    setTimeout(() => this.addedToCart.set(false), 1500);
  }

  onViewDetails() {
    this.viewDetails.emit(this.product);
  }
}
