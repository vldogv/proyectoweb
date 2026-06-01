/**
 * admin.service.ts
 * Lógica del panel de administración. Centraliza todas las llamadas HTTP
 * para que los componentes (controllers en Angular MVC) solo orquesten.
 */

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Order } from '../models/user.model';
import { Ticket } from './ticket.service';

const API = 'http://localhost:4000/api/admin';

export interface AdminProduct {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description: string;
  inStock: boolean;
  stock: number;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // ─── State centralizado (signals) ─────────────────────────────────────────
  private _productos = signal<AdminProduct[]>([]);
  private _pedidos   = signal<Order[]>([]);
  private _usuarios  = signal<AdminUser[]>([]);
  private _tickets   = signal<Ticket[]>([]);

  productos = this._productos.asReadonly();
  pedidos   = this._pedidos.asReadonly();
  usuarios  = this._usuarios.asReadonly();
  tickets   = this._tickets.asReadonly();

  // ─── PRODUCTOS ────────────────────────────────────────────────────────────

  async cargarProductos(): Promise<void> {
    try { this._productos.set(await firstValueFrom(this.http.get<AdminProduct[]>(`${API}/productos`))); }
    catch { this._productos.set([]); }
  }

  async crearProducto(data: Partial<AdminProduct>): Promise<AdminProduct | null> {
    try {
      const created = await firstValueFrom(this.http.post<AdminProduct>(`${API}/productos`, data));
      this._productos.update(list => [...list, created]);
      return created;
    } catch { return null; }
  }

  async actualizarProducto(id: number, data: Partial<AdminProduct>): Promise<AdminProduct | null> {
    try {
      const updated = await firstValueFrom(this.http.put<AdminProduct>(`${API}/productos/${id}`, data));
      this._productos.update(list => list.map(p => p.id === id ? updated : p));
      return updated;
    } catch { return null; }
  }

  async eliminarProducto(id: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${API}/productos/${id}`));
      this._productos.update(list => list.filter(p => p.id !== id));
      return true;
    } catch { return false; }
  }

  async toggleStock(producto: AdminProduct): Promise<AdminProduct | null> {
    return this.actualizarProducto(producto.id, { ...producto, inStock: !producto.inStock });
  }

  async subirImagen(file: File): Promise<string | null> {
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await firstValueFrom(this.http.post<{ url: string }>(`${API}/upload-image`, form));
      return res.url;
    } catch { return null; }
  }

  // ─── PEDIDOS ──────────────────────────────────────────────────────────────

  async cargarPedidos(): Promise<void> {
    try { this._pedidos.set(await firstValueFrom(this.http.get<Order[]>(`${API}/pedidos`))); }
    catch { this._pedidos.set([]); }
  }

  async cambiarEstadoPedido(id: string, field: 'orderStatus' | 'shippingStatus', value: string): Promise<Order | null> {
    try {
      const updated = await firstValueFrom(this.http.put<Order>(`${API}/pedidos/${id}/status`, { [field]: value }));
      this._pedidos.update(list => list.map(p => p.id === id ? updated : p));
      return updated;
    } catch { return null; }
  }

  // ─── USUARIOS ─────────────────────────────────────────────────────────────

  async cargarUsuarios(): Promise<void> {
    try { this._usuarios.set(await firstValueFrom(this.http.get<AdminUser[]>(`${API}/usuarios`))); }
    catch { this._usuarios.set([]); }
  }

  async actualizarUsuario(id: number, data: Partial<AdminUser>): Promise<AdminUser | null> {
    try {
      const updated = await firstValueFrom(this.http.put<AdminUser>(`${API}/usuarios/${id}`, data));
      this._usuarios.update(list => list.map(u => u.id === id ? updated : u));
      return updated;
    } catch { return null; }
  }

  // ─── TICKETS ──────────────────────────────────────────────────────────────

  async cargarTickets(): Promise<void> {
    try { this._tickets.set(await firstValueFrom(this.http.get<Ticket[]>(`${API}/tickets`))); }
    catch { this._tickets.set([]); }
  }

  async cambiarEstadoTicket(id: number, status: string): Promise<Ticket | null> {
    try {
      const updated = await firstValueFrom(this.http.put<Ticket>(`${API}/tickets/${id}/status`, { status }));
      this._tickets.update(list => list.map(t => t.id === id ? updated : t));
      return updated;
    } catch { return null; }
  }

  async responderTicket(id: number, message: string): Promise<Ticket | null> {
    try {
      const updated = await firstValueFrom(this.http.post<Ticket>(`${API}/tickets/${id}/reply`, { message }));
      this._tickets.update(list => list.map(t => t.id === id ? updated : t));
      return updated;
    } catch { return null; }
  }
}
