import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../../services/auth.service';
import { CarritoService } from '../../../services/carrito.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
  styleUrls: ['./site-header.component.css'],
})
export class SiteHeaderComponent {
  authService    = inject(AuthService);
  carritoService = inject(CarritoService);
  private router = inject(Router);

  @Input() transparent = false;
  @Output() toggleCart = new EventEmitter<void>();

  get isAuthenticated() { return this.authService.isAuthenticated; }
  get user()            { return this.authService.currentUser; }
  get cartCount()       { return this.carritoService.itemCount; }
  get firstName(): string {
    return this.authService.currentUser()?.fullName?.split(' ').at(0) ?? '';
  }

  onCartClick()  {
    // Verifica stock contra la BD antes de mostrar el carrito
    this.carritoService.verificarStock();
    this.toggleCart.emit();
  }
  goToAccount()  { this.router.navigate(['/cuenta']); }
  goToLogin()    { this.router.navigate(['/login']); }
}
