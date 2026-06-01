import { Component, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);

  fullName            = signal('');
  email               = signal('');
  password            = signal('');
  confirmPassword     = signal('');
  showPassword        = signal(false);
  showConfirmPassword = signal(false);
  error               = signal('');
  submitting          = signal(false);

  // Validaciones en tiempo real
  emailTouched    = signal(false);
  passwordTouched = signal(false);
  confirmTouched  = signal(false);

  isValidEmail    = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()));
  isValidPassword = computed(() => this.password().length >= 6);
  passwordsMatch  = computed(() => this.password() === this.confirmPassword() && this.confirmPassword() !== '');

  get isFormValid(): boolean {
    return (
      this.fullName().trim() !== '' &&
      this.isValidEmail() &&
      this.isValidPassword() &&
      this.passwordsMatch()
    );
  }

  togglePassword()        { this.showPassword.update(v => !v); }
  toggleConfirmPassword() { this.showConfirmPassword.update(v => !v); }

  async onSubmit() {
    if (!this.isFormValid || this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);

    const result = await this.authService.register(
      this.fullName(),
      this.email(),
      this.password()
    );
    this.submitting.set(false);

    if (result.success) {
      this.router.navigate(['/cuenta']);
    } else {
      this.error.set(result.error || 'Error al registrarse');
    }
  }

  goHome() { this.router.navigate(['/']); }
}
