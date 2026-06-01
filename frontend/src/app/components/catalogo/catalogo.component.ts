import { Component, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../producto/producto.component';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { Product } from '../../models/producto.model';
import { ProductService } from '../../services/producto.service';
import { CarritoComponent } from '../carrito/carrito.component';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [ProductCardComponent, CarritoComponent, FormsModule, SiteHeaderComponent],
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.css'],
})
export class CatalogoComponent {

  products = signal<Product[]>([]);
  inStockCount = computed(() => this.products().filter(p => p.inStock).length);

  showCart = false;

  // Filtros como signals
  searchQuery = signal('');
  selectedCategory = signal('');
  soloEnStock = signal(false);
  precioMin = signal<number | null>(null);
  precioMax = signal<number | null>(null);

  // Categorias unicas
  categories = computed(() => {
    const cats = this.products().map(p => p.category);
    return [...new Set(cats)].sort();
  });

  // Productos filtrados (se recalcula automaticamente)
  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat   = this.selectedCategory();
    const stock = this.soloEnStock();
    const min   = this.precioMin();
    const max   = this.precioMax();

    return this.products().filter(p => {
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      const matchCategory = !cat || p.category === cat;
      const matchStock    = !stock || p.inStock;
      const matchMin      = min === null || p.price >= min;
      const matchMax      = max === null || p.price <= max;

      return matchSearch && matchCategory && matchStock && matchMin && matchMax;
    });
  });

  hayFiltrosActivos = computed(() =>
    !!(this.searchQuery() || this.selectedCategory() || this.soloEnStock() || this.precioMin() !== null || this.precioMax() !== null)
  );

  // Cart count
  cartItemCount = computed(() => this.carritoService.itemCount());

  constructor(
    private productsService: ProductService,
    private carritoService: CarritoService,
    private router: Router
  ) {
    this.productsService.getAll().subscribe({
      next: (data) => this.products.set(data),
      error: (err) => console.error('Error cargando XML:', err),
    });
  }

  agregar(producto: Product) {
    this.carritoService.agregar(producto);
  }

  toggleCart() {
    this.showCart = !this.showCart;
  }

  closeCart() {
    this.showCart = false;
  }

  toggleTheme() {
    document.body.classList.toggle('dark-mode');
  }

  volverHome() {
    this.router.navigate(['/']);
  }

  limpiarFiltros() {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.soloEnStock.set(false);
    this.precioMin.set(null);
    this.precioMax.set(null);
  }

  verProducto(producto: Product) {
    this.router.navigate(['/producto', producto.id]);
  }
}
