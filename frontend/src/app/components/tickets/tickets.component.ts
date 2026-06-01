import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TicketService, Ticket } from '../../services/ticket.service';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass],
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.css'],
})
export class TicketsComponent implements OnInit {
  private authService   = inject(AuthService);
  private ticketService = inject(TicketService);
  private router        = inject(Router);

  user      = this.authService.currentUser;
  get firstName(): string { return this.authService.currentUser()?.fullName?.split(' ')[0] ?? ''; }
  tickets   = this.ticketService.tickets;
  cargando  = signal(true);
  vista     = signal<'lista' | 'nuevo'>('lista');
  toast     = signal<{ msg: string; ok: boolean } | null>(null);

  // Formulario nuevo ticket
  form = { subject: '', message: '', priority: 'normal' };
  enviando = signal(false);

  // Ticket expandido
  expandido = signal<number | null>(null);

  readonly prioridades = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];

  readonly statusLabels: Record<string, string> = {
    open: 'Abierto', in_progress: 'En proceso', resolved: 'Resuelto', closed: 'Cerrado',
  };

  async ngOnInit(): Promise<void> {
    await this.ticketService.loadMisTickets();
    this.cargando.set(false);
  }

  async enviarTicket(): Promise<void> {
    if (!this.form.subject.trim() || !this.form.message.trim()) {
      this.showToast('Asunto y mensaje son requeridos', false); return;
    }
    this.enviando.set(true);
    try {
      await this.ticketService.createTicket(this.form);
      await this.ticketService.loadMisTickets();
      this.form = { subject: '', message: '', priority: 'normal' };
      this.vista.set('lista');
      this.showToast('Ticket enviado. Te responderemos pronto.', true);
    } catch {
      this.showToast('Error al enviar ticket', false);
    } finally {
      this.enviando.set(false);
    }
  }

  toggleExpand(id: number): void {
    this.expandido.update(v => v === id ? null : id);
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set({ msg, ok });
    setTimeout(() => this.toast.set(null), 3500);
  }

  logout(): void  { this.authService.logout(); }
  goHome(): void  { this.router.navigate(['/']); }
}
