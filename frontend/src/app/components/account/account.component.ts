/**
 * account.component.ts
 * Component (controller en MVC Angular): SOLO orquesta la UI.
 * Toda la lógica HTTP vive en AuthService / OrderService / AddressService.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService }            from '../../services/auth.service';
import { OrderService }           from '../../services/order.service';
import { AddressService }         from '../../services/address.service';
import { OrderHistoryComponent }  from './order-history/order-history.component';
import { AddressListComponent }   from './address-list/address-list.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [OrderHistoryComponent, AddressListComponent, FormsModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  authService    = inject(AuthService);
  orderService   = inject(OrderService);
  addressService = inject(AddressService);
  private router = inject(Router);

  activeTab = signal<'orders' | 'addresses' | 'profile'>('orders');

  get user()      { return this.authService.currentUser; }
  get orders()    { return this.orderService.userOrders; }
  get addresses() { return this.addressService.userAddresses; }

  // ── Perfil (solo estado de UI, no lógica HTTP) ────────────────────────────
  profileForm  = { fullName: '' };
  passwordForm = { currentPassword: '', newPassword: '', confirm: '' };
  profileToast = signal<{ msg: string; ok: boolean } | null>(null);
  savingProfile = signal(false);
  savingPass    = signal(false);

  ngOnInit(): void {
    this.orderService.loadUserOrders();
    this.addressService.loadAddresses();
  }

  onProfileTabOpen(): void {
    this.profileForm.fullName = this.user()?.fullName ?? '';
  }

  async guardarPerfil(): Promise<void> {
    if (!this.profileForm.fullName.trim()) {
      this.showProfileToast('El nombre no puede estar vacío', false); return;
    }
    this.savingProfile.set(true);
    const result = await this.authService.updateProfile({ fullName: this.profileForm.fullName });
    this.savingProfile.set(false);
    this.showProfileToast(result.success ? 'Nombre actualizado' : (result.error || 'Error'), result.success);
  }

  async cambiarContrasena(): Promise<void> {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.showProfileToast('Completa todos los campos', false); return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirm) {
      this.showProfileToast('Las contraseñas no coinciden', false); return;
    }
    this.savingPass.set(true);
    const result = await this.authService.updateProfile({
      currentPassword: this.passwordForm.currentPassword,
      newPassword:     this.passwordForm.newPassword,
    });
    this.savingPass.set(false);
    if (result.success) {
      this.passwordForm = { currentPassword: '', newPassword: '', confirm: '' };
      this.showProfileToast('Contraseña actualizada', true);
    } else {
      this.showProfileToast(result.error || 'Error al cambiar contraseña', false);
    }
  }

  private showProfileToast(msg: string, ok: boolean): void {
    this.profileToast.set({ msg, ok });
    setTimeout(() => this.profileToast.set(null), 3500);
  }

  setTab(tab: 'orders' | 'addresses' | 'profile') {
    this.activeTab.set(tab);
    if (tab === 'profile') this.onProfileTabOpen();
  }
  logout() { this.authService.logout(); }
  goHome() { this.router.navigate(['/']); }
}
