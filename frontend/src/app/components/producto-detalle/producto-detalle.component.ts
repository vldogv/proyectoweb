import { Component, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ProductService } from '../../services/producto.service';
import { CarritoService } from '../../services/carrito.service';
import { Product } from '../../models/producto.model';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CurrencyPipe, SiteHeaderComponent],
  templateUrl: './producto-detalle.component.html',
  styleUrls: ['./producto-detalle.component.css'],
})
export class ProductoDetalleComponent {
  product = signal<Product | null>(null);
  loading = signal(true);
  cantidad = signal(1);
  addedToCart = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private carritoService: CarritoService
  ) {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    
    this.productService.getAll().subscribe({
      next: (products) => {
        const found = products.find(p => p.id === id);
        this.product.set(found || null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  incrementar() {
    const maxStock = this.product()?.stock ?? 999;
    this.cantidad.update(c => Math.min(c + 1, maxStock));
  }

  decrementar() {
    this.cantidad.update(c => Math.max(1, c - 1));
  }

  agregarAlCarrito() {
    const p = this.product();
    if (p && p.inStock) {
      this.carritoService.agregar(p, this.cantidad());
      this.addedToCart.set(true);
      setTimeout(() => this.addedToCart.set(false), 2000);
    }
  }

  volver() {
    this.router.navigate(['/']);
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }

  get cartItemCount() {
    return this.carritoService.itemCount;
  }
}
