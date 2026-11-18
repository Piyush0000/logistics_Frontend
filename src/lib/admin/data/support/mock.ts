import 'server-only';

import { fromMock } from '../../../data/source';
import { daysAgo, seedMerchant } from '../seed';
import type {
  AdminSupportService,
  AdminTicket,
  AdminTicketDetail,
  AdminTicketMessage,
  AdminTicketPriority,
  AdminTicketStatus,
  ListTicketsFilter,
} from './types';

function createTicket(
  id: string,
  merchantId: string,
  subject: string,
  category: string,
  status: AdminTicketStatus,
  priority: AdminTicketPriority,
  hoursAgo: number,
  messages: Array<{ sender: 'admin' | 'merchant'; body: string; hoursAgo: number }>,
): AdminTicketDetail {
  const merchant = seedMerchant(merchantId);
  const merchantName = merchant?.name ?? merchantId;
  const updatedAt = daysAgo(0, hoursAgo);

  const formattedMessages: AdminTicketMessage[] = messages.map((m, idx) => ({
    id: `${id}-msg-${idx + 1}`,
    sender: m.sender,
    senderName: m.sender === 'admin' ? 'Operations Support' : merchantName,
    body: m.body,
    createdAt: daysAgo(0, m.hoursAgo),
  }));

  return {
    id,
    merchantId,
    merchantName,
    subject,
    category,
    status,
    priority,
    updatedAt,
    messages: formattedMessages,
  };
}

function getInitialTickets(): AdminTicketDetail[] {
  return [
    createTicket(
      'TK-2041',
      'mer_003',
      'COD payout for 3 Nov not received',
      'Billing',
      'open',
      'high',
      2,
      [
        {
          sender: 'merchant',
          body: 'Hi team, our COD remittance for deliveries completed on 3 Nov (batch #4092) was due yesterday but our bank account has not received any credit. Can you please check what is causing the delay?',
          hoursAgo: 4,
        },
        {
          sender: 'admin',
          body: 'Hello UrbanThread team, we have escalated batch #4092 to our accounts reconciliation desk to trace the UTR reference with the acquiring bank. We will share the confirmation shortly.',
          hoursAgo: 3,
        },
        {
          sender: 'merchant',
          body: 'Thanks for looking into this. Please expedite as this is affecting our working capital procurement cycle.',
          hoursAgo: 2,
        },
      ],
    ),
    createTicket(
      'TK-2039',
      'mer_001',
      'Weight dispute on 6 AWBs from Ekart',
      'Shipping',
      'open',
      'normal',
      5,
      [
        {
          sender: 'merchant',
          body: 'Ekart has billed volumetric weight of 2.8kg for 6 pillow cover shipments that weigh only 450g each in standard 25x20x5cm polybags. AWBs: EVC240037, EVC240074, EVC240111. Please review and rectify the extra weight deductions.',
          hoursAgo: 5,
        },
      ],
    ),
    createTicket(
      'TK-2036',
      'mer_005',
      'Need a second pickup address in Noida',
      'Account',
      'awaiting_merchant',
      'low',
      20,
      [
        {
          sender: 'merchant',
          body: 'We are expanding operations and launching a secondary fulfillment warehouse in Sector 63, Noida. Can you enable carrier pickups from this location?',
          hoursAgo: 22,
        },
        {
          sender: 'admin',
          body: 'Hello Pixel Gadgets team, we can configure the secondary pickup hub for your account. Please reply with the complete address, PIN code, and contact person phone number so we can whitelist it with Delhivery and Ekart.',
          hoursAgo: 20,
        },
      ],
    ),
    createTicket(
      'TK-2030',
      'mer_002',
      'Webhook deliveries failing since morning',
      'Integrations',
      'open',
      'high',
      26,
      [
        {
          sender: 'merchant',
          body: 'Our order webhook ingest server has stopped receiving delivery event notifications since 08:00 AM IST. Our endpoints are operational and respond with 200 OK to health checks.',
          hoursAgo: 28,
        },
        {
          sender: 'admin',
          body: 'We identified a temporary queue consumer lag in our event dispatch service for tracking events. We restarted the delivery workers and are currently replaying unacknowledged messages.',
          hoursAgo: 26,
        },
      ],
    ),
    createTicket(
      'TK-2024',
      'mer_004',
      'Why is my account suspended?',
      'Account',
      'awaiting_merchant',
      'normal',
      50,
      [
        {
          sender: 'merchant',
          body: 'We attempted to dispatch consignments today but our dashboard displays account suspended. What is the reason and how can we get this resolved?',
          hoursAgo: 52,
        },
        {
          sender: 'admin',
          body: 'Hello Sahyadri Organics, your account was placed on temporary suspension due to an elevated RTO rate exceeding 35% on COD orders. Please submit an action plan or enable OTP delivery verification to proceed with reactivation.',
          hoursAgo: 50,
        },
      ],
    ),
    createTicket(
      'TK-2011',
      'mer_001',
      'Label printing cut off on A6',
      'Shipping',
      'resolved',
      'low',
      120,
      [
        {
          sender: 'merchant',
          body: 'When generating 4x6 / A6 thermal shipping labels, the right barcode margin is clipped by 3mm, causing carrier scanner reject issues at pickup.',
          hoursAgo: 125,
        },
        {
          sender: 'admin',
          body: 'We have updated the CSS margins for the thermal PDF generator template. New label downloads now render with full printable boundary clearance. Marking this ticket resolved.',
          hoursAgo: 120,
        },
      ],
    ),
    createTicket(
      'TK-2008',
      'mer_006',
      'Query regarding GST invoice upload',
      'Billing',
      'open',
      'normal',
      140,
      [
        {
          sender: 'merchant',
          body: 'Are we required to generate and upload separate e-way bills for interstate consignments valued above ₹50,000 when dispatching via Shadowfax?',
          hoursAgo: 140,
        },
      ],
    ),
    createTicket(
      'TK-2005',
      'mer_007',
      'Cold chain shipping availability',
      'Shipping',
      'resolved',
      'normal',
      160,
      [
        {
          sender: 'merchant',
          body: 'Do you offer temperature controlled cold chain transit for pharmaceutical diagnostics between Mumbai and Delhi?',
          hoursAgo: 165,
        },
        {
          sender: 'admin',
          body: 'Our integrated courier partners currently provide dry express parcel cargo. Active temperature logging and cold chain transit are planned for an upcoming platform release.',
          hoursAgo: 160,
        },
      ],
    ),
  ];
}

let store: AdminTicketDetail[] = getInitialTickets();

export function resetMockSupport(): void {
  store = getInitialTickets();
}

export const mockAdminSupportService: AdminSupportService = {
  async listTickets(filterOrStatus) {
    let filter: ListTicketsFilter = {};
    if (typeof filterOrStatus === 'string') {
      filter = { status: filterOrStatus };
    } else if (filterOrStatus) {
      filter = filterOrStatus;
    }

    let results = [...store];

    if (filter.status) {
      results = results.filter((t) => t.status === filter.status);
    }
    if (filter.priority) {
      results = results.filter((t) => t.priority === filter.priority);
    }
    if (filter.merchantId) {
      results = results.filter((t) => t.merchantId === filter.merchantId);
    }
    if (filter.query) {
      const q = filter.query.trim().toLowerCase();
      if (q) {
        results = results.filter(
          (t) =>
            t.id.toLowerCase().includes(q) ||
            t.subject.toLowerCase().includes(q) ||
            t.merchantName.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q),
        );
      }
    }

    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Map to AdminTicket (without deep messages for list efficiency)
    const listItems: AdminTicket[] = results.map((t) => ({
      id: t.id,
      merchantId: t.merchantId,
      merchantName: t.merchantName,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      updatedAt: t.updatedAt,
    }));
    return fromMock(listItems);
  },

  async getTicket(id) {
    const ticket = store.find((t) => t.id.toLowerCase() === id.trim().toLowerCase());
    if (!ticket) {
      return fromMock(null);
    }
    return fromMock(structuredClone(ticket));
  },

  async reply(id, message) {
    const trimmed = message.trim();
    if (trimmed.length < 2 || trimmed.length > 5000) {
      throw new Error('Reply message must be between 2 and 5,000 characters.');
    }

    const ticket = store.find((t) => t.id.toLowerCase() === id.trim().toLowerCase());
    if (!ticket) {
      throw new Error(`Ticket ${id} not found.`);
    }

    const now = new Date().toISOString();
    const newMsg: AdminTicketMessage = {
      id: `${ticket.id}-msg-${ticket.messages.length + 1}`,
      sender: 'admin',
      senderName: 'Operations Support',
      body: trimmed,
      createdAt: now,
    };

    ticket.messages.push(newMsg);
    ticket.updatedAt = now;

    // Rule: "a resolved ticket reopens on reply"
    if (ticket.status === 'resolved') {
      ticket.status = 'open';
    } else if (ticket.status === 'open') {
      ticket.status = 'awaiting_merchant';
    }

    return fromMock(structuredClone(ticket));
  },

  async updateTicket(id, updates) {
    const ticket = store.find((t) => t.id.toLowerCase() === id.trim().toLowerCase());
    if (!ticket) {
      throw new Error(`Ticket ${id} not found.`);
    }

    if (updates.status) {
      ticket.status = updates.status;
    }
    if (updates.priority) {
      ticket.priority = updates.priority;
    }
    ticket.updatedAt = new Date().toISOString();

    return fromMock(structuredClone(ticket));
  },
};
