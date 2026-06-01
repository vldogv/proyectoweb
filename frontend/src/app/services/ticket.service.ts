import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = 'http://localhost:4000/api';

export interface TicketReply {
  id: number;
  ticketId: number;
  fromAdmin: boolean;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  userId: number | null;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);

  private _tickets = signal<Ticket[]>([]);
  tickets = this._tickets.asReadonly();

  async loadMisTickets(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<Ticket[]>(`${API}/tickets/mis-tickets`));
      this._tickets.set(data);
    } catch { this._tickets.set([]); }
  }

  async createTicket(payload: {
    subject: string;
    message: string;
    priority?: string;
    userName?: string;
    userEmail?: string;
  }): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(`${API}/tickets`, payload));
  }
}
