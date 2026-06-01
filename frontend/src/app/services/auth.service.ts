import {
  Injectable,
  signal,
  computed,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { CarritoService } from './carrito.service';

const API = 'http://localhost:4000/api';

interface AuthResponse {
  token: string;
  user: { id: number; fullName: string; email: string; isAdmin?: boolean };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private carritoService = inject(CarritoService);

  private currentUserSignal = signal<User | null>(null);

  currentUser     = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => this.currentUserSignal() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this._restoreSession();
    }
  }

  // ─── Restaurar sesión desde token guardado ────────────────────────────────

  private async _restoreSession(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Sin token: queda con carrito de invitado (ya cargado por CarritoService)
      return;
    }

    try {
      const data = await firstValueFrom(
        this.http.get<{ id: number; fullName: string; email: string; isAdmin?: boolean }>(
          `${API}/auth/me`
        )
      );
      this.currentUserSignal.set(this._toUser(data));
      // Cargar el carrito persistente del usuario (sin fusionar con invitado)
      this.carritoService.loadCartForUser(data.id);
    } catch {
      // Token expirado o inválido — limpiarlo
      localStorage.removeItem('auth_token');
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${API}/auth/login`, { email, password })
      );
      this._saveSession(res);
      // Fusiona el carrito de invitado con el carrito del usuario que entra
      this.carritoService.mergeGuestCartInto(res.user.id);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.error?.error || 'Email o contraseña incorrectos',
      };
    }
  }

  // ─── Registro ─────────────────────────────────────────────────────────────

  async register(
    fullName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${API}/auth/register`, {
          fullName,
          email,
          password,
        })
      );
      this._saveSession(res);
      // El nuevo usuario hereda lo que tenía como invitado
      this.carritoService.mergeGuestCartInto(res.user.id);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.error?.error || 'Este email ya está registrado',
      };
    }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  /** Actualiza el signal del usuario actual (ej. tras editar perfil) */
  updateCurrentUser(u: { id: number; fullName: string; email: string; isAdmin?: boolean }): void {
    this.currentUserSignal.set(this._toUser(u));
  }

  // ─── Recuperación de contraseña ───────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ success: boolean; error?: string; devResetUrl?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string; devResetUrl?: string }>(`${API}/auth/forgot-password`, { email })
      );
      return { success: true, devResetUrl: res.devResetUrl };
    } catch (err: any) {
      return { success: false, error: err?.error?.error || 'Error al procesar solicitud' };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(this.http.post(`${API}/auth/reset-password`, { token, newPassword }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.error?.error || 'El enlace no es válido o ya expiró' };
    }
  }

  // ─── Perfil ───────────────────────────────────────────────────────────────

  async updateProfile(data: { fullName?: string; currentPassword?: string; newPassword?: string })
    : Promise<{ success: boolean; error?: string }> {
    try {
      const updated = await firstValueFrom(
        this.http.put<{ id: number; fullName: string; email: string; isAdmin?: boolean }>(`${API}/auth/perfil`, data)
      );
      this.updateCurrentUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.error?.error || 'Error al actualizar perfil' };
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
    }
    this.currentUserSignal.set(null);
    // El carrito del usuario queda guardado en su key. Volvemos al de invitado.
    this.carritoService.loadCartForUser(null);
    this.router.navigate(['/']);
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private _saveSession(res: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', res.token);
    }
    this.currentUserSignal.set(this._toUser(res.user));
  }

  private _toUser(u: { id: number; fullName: string; email: string; isAdmin?: boolean }): User {
    return { id: u.id, fullName: u.fullName, email: u.email, isAdmin: u.isAdmin ?? false, password: '', createdAt: new Date() };
  }
}
