import type { DataResult } from '../../../data/source';

export const ADMIN_TICKET_STATUSES = ['open', 'awaiting_merchant', 'resolved'] as const;
export type AdminTicketStatus = (typeof ADMIN_TICKET_STATUSES)[number];

/** A merchant's support ticket, as the admin inbox shows it. */
export interface AdminTicket {
  id: string;
  merchantId: string;
  merchantName: string;
  subject: string;
  category: string;
  status: AdminTicketStatus;
  priority: 'low' | 'normal' | 'high';
  /** ISO timestamp. */
  updatedAt: string;
}

export interface AdminSupportService {
  listTickets(status?: AdminTicketStatus): Promise<DataResult<AdminTicket[]>>;
  // Planned (Teammate 1): getTicket(id) with the thread, reply(id, message), setStatus(id, status).
}
