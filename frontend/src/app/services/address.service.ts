import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Address } from '../models/user.model';
import { AuthService } from './auth.service';

const API = 'http://localhost:4000/api';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private platformId  = inject(PLATFORM_ID);
  private http        = inject(HttpClient);
  private authService = inject(AuthService);

  private addressesSignal = signal<Address[]>([]);

  /** Direcciones del usuario actual (reactivo) */
  userAddresses = this.addressesSignal.asReadonly();

  /** Dirección predeterminada del usuario actual */
  defaultAddress = computed(
    () => this.addressesSignal().find(a => a.isDefault) ?? null
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Cargar/limpiar direcciones cada vez que cambie el usuario autenticado
      effect(() => {
        const user = this.authService.currentUser();
        if (user) {
          this.loadAddresses();
        } else {
          this.addressesSignal.set([]);
        }
      });
    }
  }

  // ─── Carga inicial ────────────────────────────────────────────────────────

  async loadAddresses(): Promise<void> {
    try {
      const raw = await firstValueFrom(
        this.http.get<any[]>(`${API}/direcciones`)
      );
      this.addressesSignal.set(raw.map(this._mapAddress));
    } catch {
      this.addressesSignal.set([]);
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async addAddress(
    data: Omit<Address, 'id' | 'userId'>
  ): Promise<Address | null> {
    try {
      const raw = await firstValueFrom(
        this.http.post<any>(`${API}/direcciones`, data)
      );
      const address = this._mapAddress(raw);
      // Si es la default, desmarcar las demás en el signal
      if (address.isDefault) {
        this.addressesSignal.update(list =>
          list.map(a => ({ ...a, isDefault: false }))
        );
      }
      this.addressesSignal.update(list => [...list, address]);
      return address;
    } catch {
      return null;
    }
  }

  async updateAddress(
    id: number,
    data: Partial<Omit<Address, 'id' | 'userId'>>
  ): Promise<boolean> {
    try {
      const raw = await firstValueFrom(
        this.http.put<any>(`${API}/direcciones/${id}`, data)
      );
      const updated = this._mapAddress(raw);
      if (updated.isDefault) {
        this.addressesSignal.update(list =>
          list.map(a => (a.id === id ? updated : { ...a, isDefault: false }))
        );
      } else {
        this.addressesSignal.update(list =>
          list.map(a => (a.id === id ? updated : a))
        );
      }
      return true;
    } catch {
      return false;
    }
  }

  async deleteAddress(id: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${API}/direcciones/${id}`));
      this.addressesSignal.update(list => list.filter(a => a.id !== id));
      // Si quedan direcciones sin default, la primera pasa a serlo
      const remaining = this.addressesSignal();
      if (remaining.length > 0 && !remaining.some(a => a.isDefault)) {
        await this.setAsDefault(remaining[0].id);
      }
      return true;
    } catch {
      return false;
    }
  }

  async setAsDefault(id: number): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.put(`${API}/direcciones/${id}/default`, {})
      );
      this.addressesSignal.update(list =>
        list.map(a => ({ ...a, isDefault: a.id === id }))
      );
      return true;
    } catch {
      return false;
    }
  }

  getAddressById(id: number): Address | undefined {
    return this.addressesSignal().find(a => a.id === id);
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private _mapAddress(raw: any): Address {
    return {
      id:         raw.id,
      userId:     raw.userId,
      label:      raw.label,
      fullName:   raw.fullName,
      street:     raw.street,
      city:       raw.city,
      postalCode: raw.postalCode,
      phone:      raw.phone,
      isDefault:  !!raw.isDefault,
    };
  }
}
