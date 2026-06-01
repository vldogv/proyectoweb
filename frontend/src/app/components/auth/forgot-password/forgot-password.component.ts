import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);

  email       = '';
  loading     = signal(false);
  sent        = signal(false);
  error       = signal('');
  devResetUrl = signal<string | null>(null);   // ← solo modo desarrollo

  async submit(): Promise<void> {
    if (!this.email.trim()) { this.error.set('Ingresa tu email'); return; }
    this.error.set('');
    this.loading.set(true);

    const result = await this.authService.forgotPassword(this.email);
    this.loading.set(false);

    if (result.success) {
      this.sent.set(true);
      // Si el backend está en modo desarrollo, devuelve el link directo
      if (result.devResetUrl) this.devResetUrl.set(result.devResetUrl);
    } else {
      this.error.set(result.error || 'Error al procesar solicitud');
    }
  }
}
