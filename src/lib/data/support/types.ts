import type { DataResult } from '../source';

export const TICKET_CATEGORIES = ['shipment', 'pickup', 'billing', 'cod', 'weight', 'technical', 'other'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = ['open', 'awaiting_you', 'resolved'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  shipment: 'Shipment',
  pickup: 'Pickup',
  billing: 'Billing',
  cod: 'COD remittance',
  weight: 'Weight discrepancy',
  technical: 'Technical',
  other: 'Other',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  awaiting_you: 'Awaiting you',
  resolved: 'Resolved',
};

export const TICKET_PAGE_SIZE = 10;

export interface TicketMessage {
  from: 'you' | 'support';
  body: string;
  /** An ISO timestamp. */
  at: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  awb: string | null;
  status: TicketStatus;
  /** An ISO timestamp. */
  updatedAt: string;
  messages: TicketMessage[];
}

export interface NewTicket {
  subject: string;
  category: TicketCategory;
  awb: string | null;
  body: string;
}

export interface SupportService {
  listTickets(query: {
    status?: TicketStatus;
    page: number;
  }): Promise<DataResult<{ items: Ticket[]; page: number; pageCount: number }>>;
  getTicket(id: string): Promise<DataResult<Ticket>>;
  createTicket(input: NewTicket): Promise<DataResult<Ticket>>;
  reply(id: string, body: string): Promise<DataResult<Ticket>>;
}
