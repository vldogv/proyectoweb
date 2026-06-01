/**
 * admin.component.ts
 * Component (controller en MVC Angular): SOLO orquesta la UI.
 * Toda la lógica HTTP/datos vive en AdminService.
 */

import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AdminService, AdminProduct, AdminUser } from '../../services/admin.service';
import { Ticket } from '../../services/ticket.service';
import { OrderStatus, ShippingStatus } from '../../models/user.model';

// Re-export para que otros archivos puedan seguir importando los tipos desde aquí
export type { AdminProduct, AdminUser } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgClass, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminService);
  private authService = inject(AuthService);
  private router      = inject(Router);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  activeTab = signal<'pedidos' | 'productos' | 'usuarios' | 'tickets'>('pedidos');

  // ── Signals expuestos al template (vienen del servicio) ───────────────────
  pedidos   = this.adminService.pedidos;
  productos = this.adminService.productos;
  usuarios  = this.adminService.usuarios;
  tickets   = this.adminService.tickets;

  cargandoPedidos   = signal(true);
  cargandoProductos = signal(true);
  cargandoUsuarios  = signal(true);
  cargandoTickets   = signal(true);

  // ── Catálogos de estados ──────────────────────────────────────────────────
  readonly orderStatuses: { value: OrderStatus; label: string }[] = [
    { value: 'pending',    label: 'Pendiente'   },
    { value: 'processing', label: 'Procesando'  },
    { value: 'shipped',    label: 'Enviado'     },
    { value: 'delivered',  label: 'Entregado'   },
    { value: 'cancelled',  label: 'Cancelado'   },
  ];
  readonly shippingStatuses: { value: ShippingStatus; label: string }[] = [
    { value: 'pending',          label: 'Confirmado'  },
    { value: 'ready',            label: 'Preparando'  },
    { value: 'picked_up',        label: 'Recolectado' },
    { value: 'in_transit',       label: 'En camino'   },
    { value: 'out_for_delivery', label: 'En reparto'  },
    { value: 'delivered',        label: 'Entregado'   },
  ];
  readonly ticketStatuses = [
    { value: 'open',        label: 'Abierto'    },
    { value: 'in_progress', label: 'En proceso' },
    { value: 'resolved',    label: 'Resuelto'   },
    { value: 'closed',      label: 'Cerrado'    },
  ];
  readonly statusLabels: Record<string, string> = {
    open: 'Abierto', in_progress: 'En proceso', resolved: 'Resuelto', closed: 'Cerrado',
  };
  readonly priorityLabels: Record<string, string> = {
    low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente',
  };
  readonly categorias = ['Cremas', 'Esencias', 'Mieles', 'Jabones', 'Aceites', 'Otros'];

  // ── Estado de UI ──────────────────────────────────────────────────────────
  editandoProducto    = signal<AdminProduct | null>(null);
  mostrarFormProducto = signal(false);
  productoForm: Partial<AdminProduct> = {};
  imagenPreview  = signal<string>('');
  subiendoImagen = signal(false);

  editandoUsuario = signal<AdminUser | null>(null);
  usuarioForm: Partial<AdminUser> = {};

  ticketExpandido = signal<number | null>(null);
  replyForms: Record<number, string> = {};
  enviandoReply = signal<number | null>(null);

  toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  // ── Ciclo de vida ─────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.adminService.cargarPedidos().finally(() => this.cargandoPedidos.set(false)),
      this.adminService.cargarProductos().finally(() => this.cargandoProductos.set(false)),
      this.adminService.cargarUsuarios().finally(() => this.cargandoUsuarios.set(false)),
      this.adminService.cargarTickets().finally(() => this.cargandoTickets.set(false)),
    ]);
  }

  // ── Pedidos ───────────────────────────────────────────────────────────────
  async cambiarEstadoPedido(id: string, field: 'orderStatus' | 'shippingStatus', value: string): Promise<void> {
    const result = await this.adminService.cambiarEstadoPedido(id, field, value);
    this.showToast(result ? 'Estado actualizado' : 'Error al actualizar', result ? 'ok' : 'err');
  }

  // ── Productos ─────────────────────────────────────────────────────────────
  abrirNuevoProducto(): void {
    this.productoForm = { inStock: true, stock: 10 };
    this.imagenPreview.set('');
    this.editandoProducto.set(null);
    this.mostrarFormProducto.set(true);
  }

  abrirEditar(p: AdminProduct): void {
    this.productoForm = { ...p };
    this.imagenPreview.set(p.imageUrl);
    this.editandoProducto.set(p);
    this.mostrarFormProducto.set(true);
  }

  cancelarForm(): void {
    this.mostrarFormProducto.set(false);
    this.editandoProducto.set(null);
    this.productoForm = {};
    this.imagenPreview.set('');
  }

  async onImagenSeleccionada(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onload = e => this.imagenPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.subiendoImagen.set(true);
    const url = await this.adminService.subirImagen(file);
    this.subiendoImagen.set(false);

    if (url) {
      this.productoForm.imageUrl = url;
      this.imagenPreview.set(url);
      this.showToast('Imagen subida', 'ok');
    } else {
      this.imagenPreview.set('');
      this.showToast('Error al subir imagen', 'err');
    }
  }

  async guardarProducto(): Promise<void> {
    const f = this.productoForm;
    if (!f.name || !f.price || !f.category) {
      this.showToast('Nombre, precio y categoría son requeridos', 'err'); return;
    }
    const editing = this.editandoProducto();
    const result = editing
      ? await this.adminService.actualizarProducto(editing.id, f)
      : await this.adminService.crearProducto(f);
    if (result) {
      this.showToast(editing ? 'Producto actualizado' : 'Producto creado', 'ok');
      this.cancelarForm();
    } else {
      this.showToast('Error al guardar producto', 'err');
    }
  }

  async eliminarProducto(id: number): Promise<void> {
    if (!confirm('¿Eliminar este producto?')) return;
    const ok = await this.adminService.eliminarProducto(id);
    this.showToast(ok ? 'Producto eliminado' : 'Error al eliminar', ok ? 'ok' : 'err');
  }

  async toggleStock(p: AdminProduct): Promise<void> {
    const result = await this.adminService.toggleStock(p);
    if (!result) this.showToast('Error al actualizar disponibilidad', 'err');
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────
  abrirEditarUsuario(u: AdminUser): void {
    this.usuarioForm = { ...u };
    this.editandoUsuario.set(u);
  }

  cancelarEditarUsuario(): void {
    this.editandoUsuario.set(null);
    this.usuarioForm = {};
  }

  async guardarUsuario(): Promise<void> {
    const u = this.editandoUsuario();
    if (!u) return;
    const result = await this.adminService.actualizarUsuario(u.id, this.usuarioForm);
    if (result) {
      this.cancelarEditarUsuario();
      this.showToast('Usuario actualizado', 'ok');
    } else {
      this.showToast('Error al actualizar usuario', 'err');
    }
  }

  // ── Tickets ───────────────────────────────────────────────────────────────
  toggleTicket(id: number): void {
    this.ticketExpandido.update(v => v === id ? null : id);
  }

  async cambiarEstadoTicket(id: number, status: string): Promise<void> {
    const result = await this.adminService.cambiarEstadoTicket(id, status);
    if (!result) this.showToast('Error al cambiar estado', 'err');
  }

  async responderTicket(ticket: Ticket): Promise<void> {
    const msg = this.replyForms[ticket.id]?.trim();
    if (!msg) return;
    this.enviandoReply.set(ticket.id);
    const result = await this.adminService.responderTicket(ticket.id, msg);
    this.enviandoReply.set(null);
    if (result) {
      this.replyForms[ticket.id] = '';
      this.showToast('Respuesta enviada', 'ok');
    } else {
      this.showToast('Error al responder', 'err');
    }
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────
  private showToast(msg: string, tipo: 'ok' | 'err'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => this.toast.set(null), 3000);
  }

  getOrderStatusLabel(s: string): string {
    return this.orderStatuses.find(x => x.value === s)?.label ?? s;
  }
  getShippingLabel(s: string): string {
    return this.shippingStatuses.find(x => x.value === s)?.label ?? s;
  }

  logout(): void { this.authService.logout(); }
  goHome(): void { this.router.navigate(['/']); }
}
