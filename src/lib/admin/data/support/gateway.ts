import 'server-only';

import { gatewayFetch } from '../../../gateway/client';
import { ticketSchema } from '../../../data/support/gateway';
import { z } from 'zod';
import { adminToken, mapResult } from '../admin-fetch';
import type { AdminSupportService, AdminTicket, AdminTicketDetail, AdminTicketPriority, AdminTicketStatus } from './types';

type ApiTicket = z.infer<typeof ticketSchema>;

const STATUS: Record<ApiTicket['status'], AdminTicketStatus> = {
  OPEN: 'open',
  AWAITING_MERCHANT: 'awaiting_merchant',
  RESOLVED: 'resolved',
};
const API_STATUS: Record<AdminTicketStatus, ApiTicket['status']> = {
  open: 'OPEN',
  awaiting_merchant: 'AWAITING_MERCHANT',
  resolved: 'RESOLVED',
};
const toPriority = (p: ApiTicket['priority']) => p.toLowerCase() as AdminTicketPriority;

function toTicket(t: ApiTicket): AdminTicket {
  return {
    id: t.id,
    merchantId: t.merchant_id,
    merchantName: t.merchant_name,
    subject: `#${t.number} ${t.subject}`,
    category: t.category,
    status: STATUS[t.status],
    priority: toPriority(t.priority),
    updatedAt: t.updated_at,
  };
}

function toDetail(t: ApiTicket): AdminTicketDetail {
  return {
    ...toTicket(t),
    messages: (t.messages ?? []).map((m) => ({
      id: m.id,
      sender: m.sender === 'ADMIN' ? 'admin' : 'merchant',
      senderName: m.sender_name,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

const path = (id?: string) => `/api/v1/admin/support/tickets${id ? `/${encodeURIComponent(id)}` : ''}`;

/** Every merchant's tickets from /api/v1/admin/support/tickets. Replies are signed "Evoc support". */
export const gatewayAdminSupportService: AdminSupportService = {
  async listTickets(filterOrStatus) {
    const filter = typeof filterOrStatus === 'string' ? { status: filterOrStatus } : (filterOrStatus ?? {});
    const result = await gatewayFetch(path(), {
      schema: z.object({ items: z.array(ticketSchema) }),
      token: adminToken(),
      query: {
        status: filter.status ? API_STATUS[filter.status] : undefined,
        priority: filter.priority?.toUpperCase(),
        q: filter.query?.trim() || undefined,
        merchant_id: filter.merchantId,
      },
    });
    return mapResult(result, ({ items }) => items.map(toTicket));
  },

  async getTicket(id) {
    const result = await gatewayFetch(path(id), { schema: ticketSchema, token: adminToken() });
    if (!result.ok && result.error.kind === 'not_found') return { ok: true, source: 'gateway', data: null };
    return mapResult(result, toDetail);
  },

  async reply(id, message) {
    const result = await gatewayFetch(`${path(id)}/messages`, {
      method: 'POST',
      schema: ticketSchema,
      token: adminToken(),
      body: { body: message, sender_name: 'Evoc support' },
    });
    return mapResult(result, toDetail);
  },

  async updateTicket(id, updates) {
    const result = await gatewayFetch(path(id), {
      method: 'POST',
      schema: ticketSchema,
      token: adminToken(),
      body: {
        ...(updates.status ? { status: API_STATUS[updates.status] } : {}),
        ...(updates.priority ? { priority: updates.priority.toUpperCase() } : {}),
      },
    });
    return mapResult(result, toDetail);
  },
};
