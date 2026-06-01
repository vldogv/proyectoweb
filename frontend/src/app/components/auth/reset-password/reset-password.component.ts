import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);

  token       = '';
  newPassword = '';
  confirm     = '';
  loading     = signal(false);
  done        = signal(false);
  error       = signal('');

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.error.set('Enlace inválido. Solicita uno nuevo.');
  }

  async submit(): Promise<void> {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres'); return;
    }
    if (this.newPassword !== this.confirm) {
      this.error.set('Las contraseñas no coinciden'); return;
    }
    this.error.set('');
    this.loading.set(true);

    const result = await this.authService.resetPassword(this.token, this.newPassword);
    this.loading.set(false);

    if (result.success) {
      this.done.set(true);
      setTimeout(() => this.router.navigate(['/login']), 3000);
    } else {
      this.error.set(result.error || 'El enlace no es válido o ya expiró');
    }
  }
}
