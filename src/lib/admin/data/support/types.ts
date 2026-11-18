import type { DataResult } from '../../../data/source';

export const ADMIN_TICKET_STATUSES = ['open', 'awaiting_merchant', 'resolved'] as const;
export type AdminTicketStatus = (typeof ADMIN_TICKET_STATUSES)[number];

export const ADMIN_TICKET_PRIORITIES = ['low', 'normal', 'high'] as const;
export type AdminTicketPriority = (typeof ADMIN_TICKET_PRIORITIES)[number];

/** A single message in a support ticket thread. */
export interface AdminTicketMessage {
  id: string;
  sender: 'admin' | 'merchant';
  senderName: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** A merchant's support ticket, as the admin inbox shows it. */
export interface AdminTicket {
  id: string;
  merchantId: string;
  merchantName: string;
  subject: string;
  category: string;
  status: AdminTicketStatus;
  priority: AdminTicketPriority;
  /** ISO timestamp. */
  updatedAt: string;
}

/** A full ticket with thread history. */
export interface AdminTicketDetail extends AdminTicket {
  messages: AdminTicketMessage[];
}

export interface ListTicketsFilter {
  status?: AdminTicketStatus;
  priority?: AdminTicketPriority;
  query?: string;
  merchantId?: string;
}

export interface AdminSupportService {
  listTickets(filterOrStatus?: ListTicketsFilter | AdminTicketStatus): Promise<DataResult<AdminTicket[]>>;
  getTicket(id: string): Promise<DataResult<AdminTicketDetail | null>>;
  reply(id: string, message: string): Promise<DataResult<AdminTicketDetail>>;
  updateTicket(id: string, updates: { status?: AdminTicketStatus; priority?: AdminTicketPriority }): Promise<DataResult<AdminTicketDetail>>;
}
