import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  email         = signal('');
  password      = signal('');
  showPassword  = signal(false);
  error         = signal('');
  submitting    = signal(false);

  get isFormValid(): boolean {
    return this.email().trim() !== '' && this.password().trim() !== '';
  }

  togglePassword() { this.showPassword.update(v => !v); }

  async onSubmit() {
    if (!this.isFormValid || this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);

    const result = await this.authService.login(this.email(), this.password());
    this.submitting.set(false);

    if (result.success) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/cuenta';
      this.router.navigateByUrl(returnUrl);
    } else {
      this.error.set(result.error || 'Error al iniciar sesión');
    }
  }

  goHome() { this.router.navigate(['/']); }
}
