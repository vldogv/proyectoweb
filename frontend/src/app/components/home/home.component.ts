import { Component, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HeroComponent } from './hero/hero.component';
import { BenefitsComponent } from './benefits/benefits.component';
import { FeaturedProductsComponent } from './featured-products/featured-products.component';
import { TestimonialsComponent } from './testimonials/testimonials.component';
import { UrgencyComponent } from './urgency/urgency.component';
import { CtaBannerComponent } from './cta-banner/cta-banner.component';
import { FooterComponent } from './footer/footer.component';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { Product } from '../../models/producto.model';
import { ProductService } from '../../services/producto.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    SiteHeaderComponent,
    HeroComponent,
    BenefitsComponent,
    FeaturedProductsComponent,
    TestimonialsComponent,
    UrgencyComponent,
    CtaBannerComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  products = signal<Product[]>([]);
  featuredProducts = computed(() => this.products().slice(0, 6));
  showCart = false;
  cartItemCount = computed(() => this.carritoService.itemCount());

  constructor(
    private productsService: ProductService,
    private carritoService: CarritoService,
    private router: Router
  ) {
    this.productsService.getAll().subscribe({
      next: (data) => this.products.set(data),
      error: (err) => console.error('Error cargando productos:', err),
    });
  }

  scrollToProducts() {
    this.router.navigate(['/catalogo']);
  }

  addToCart(product: Product) {
    this.carritoService.agregar(product);
  }

  viewProduct(product: Product) {
    this.router.navigate(['/producto', product.id]);
  }

  toggleCart() {
    this.router.navigate(['/carrito']);
  }

  closeCart() {
    this.showCart = false;
  }

  toggleTheme() {
    document.body.classList.toggle('dark-mode');
  }
}
