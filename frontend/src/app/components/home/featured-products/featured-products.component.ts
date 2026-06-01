import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Product } from '../../../models/producto.model';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './featured-products.component.html',
  styleUrls: ['./featured-products.component.css']
})
export class FeaturedProductsComponent {
  @Input() products: Product[] = [];
  @Output() addToCart = new EventEmitter<Product>();
  @Output() viewProduct = new EventEmitter<Product>();

  addedProducts = new Set<number>();

  onAddToCart(product: Product) {
    this.addToCart.emit(product);
    this.addedProducts.add(product.id);
    setTimeout(() => this.addedProducts.delete(product.id), 2000);
  }

  onViewProduct(product: Product) {
    this.viewProduct.emit(product);
  }

  isAdded(productId: number): boolean {
    return this.addedProducts.has(productId);
  }

  getDiscountedPrice(price: number): number {
    return price * 0.8; // 20% off for featured
  }
}
