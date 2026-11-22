import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import { TICKET_CATEGORIES, TICKET_PAGE_SIZE, type Ticket, type TicketStatus, type SupportService } from './types';

export const ticketSchema = z.object({
  id: z.string(),
  number: z.number(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  subject: z.string(),
  category: z.string(),
  awb: z.string().nullable(),
  status: z.enum(['OPEN', 'AWAITING_MERCHANT', 'RESOLVED']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']),
  created_at: z.string(),
  updated_at: z.string(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        sender: z.enum(['MERCHANT', 'ADMIN']),
        sender_name: z.string(),
        body: z.string(),
        created_at: z.string(),
      }),
    )
    .optional(),
});
type ApiTicket = z.infer<typeof ticketSchema>;

const STATUS: Record<ApiTicket['status'], TicketStatus> = {
  OPEN: 'open',
  AWAITING_MERCHANT: 'awaiting_you',
  RESOLVED: 'resolved',
};
const API_STATUS: Record<TicketStatus, ApiTicket['status']> = {
  open: 'OPEN',
  awaiting_you: 'AWAITING_MERCHANT',
  resolved: 'RESOLVED',
};

function toTicket(t: ApiTicket): Ticket {
  const category = (TICKET_CATEGORIES as readonly string[]).includes(t.category)
    ? (t.category as Ticket['category'])
    : 'other';
  return {
    id: t.id,
    subject: t.subject,
    category,
    awb: t.awb,
    status: STATUS[t.status],
    updatedAt: t.updated_at,
    messages: (t.messages ?? []).map((m) => ({
      from: m.sender === 'MERCHANT' ? 'you' : 'support',
      body: m.body,
      at: m.created_at,
    })),
  };
}

const path = (id?: string) => `/api/v1/support/tickets${id ? `/${encodeURIComponent(id)}` : ''}`;

/** Support tickets from /api/v1/support/tickets: the merchant's side of the conversation. */
export const gatewaySupportService: SupportService = {
  async listTickets({ status, page }) {
    const result = await gatewayFetch(path(), {
      schema: z.object({ items: z.array(ticketSchema), page: z.number(), limit: z.number(), total: z.number() }),
      token: await merchantCredential('shipments'),
      query: { status: status ? API_STATUS[status] : undefined, page, limit: TICKET_PAGE_SIZE },
    });
    if (!result.ok) return fromGateway(result);
    const { items, total, limit } = result.data;
    return fromGateway({
      ...result,
      data: { items: items.map(toTicket), page: result.data.page, pageCount: Math.max(1, Math.ceil(total / limit)) },
    });
  },

  async getTicket(id) {
    const result = await gatewayFetch(path(id), { schema: ticketSchema, token: await merchantCredential('shipments') });
    return fromGateway(result.ok ? { ...result, data: toTicket(result.data) } : result);
  },

  async createTicket(input) {
    const result = await gatewayFetch(path(), {
      method: 'POST',
      schema: ticketSchema,
      token: await merchantCredential('shipments'),
      body: { subject: input.subject, category: input.category, awb: input.awb, body: input.body },
    });
    return fromGateway(result.ok ? { ...result, data: toTicket(result.data) } : result);
  },

  async reply(id, body) {
    const result = await gatewayFetch(`${path(id)}/messages`, {
      method: 'POST',
      schema: ticketSchema,
      token: await merchantCredential('shipments'),
      body: { body },
    });
    return fromGateway(result.ok ? { ...result, data: toTicket(result.data) } : result);
  },
};
