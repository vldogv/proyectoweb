import { Component, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { Order, ShippingStatus } from '../../../models/user.model';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css'],
})
export class OrderHistoryComponent {
  orderService   = inject(OrderService);
  private router = inject(Router);

  expandedOrder = signal<string | null>(null);

  get orders() { return this.orderService.userOrders; }

  toggleOrder(id: string): void {
    this.expandedOrder.set(this.expandedOrder() === id ? null : id);
  }

  isExpanded(id: string): boolean { return this.expandedOrder() === id; }

  verSeguimiento(id: string): void {
    this.router.navigate(['/pedido', id]);
  }

  // ─── Order status ──────────────────────────────────────────────────────────
  getStatusLabel(status: Order['status']): string {
    return this.orderService.getStatusLabel(status);
  }

  getStatusColor(status: Order['status']): string {
    return this.orderService.getStatusColor(status);
  }

  // ─── Shipping status ───────────────────────────────────────────────────────
  getShippingLabel(status: ShippingStatus): string {
    return this.orderService.getShippingStatusLabel(status);
  }

  getShippingColor(status: ShippingStatus): string {
    return this.orderService.getShippingStatusColor(status);
  }
}
