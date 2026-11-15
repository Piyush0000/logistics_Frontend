import 'server-only';

import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { checkReply, checkTicket } from './input';
import {
  TICKET_PAGE_SIZE,
  type SupportService,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
} from './types';

/**
 * Resolved tickets at the end of the sample for browser tests to reply to. Replying reopens a
 * ticket for good, and every test run on one server shares this store, so each run takes a
 * ticket of its own (see e2e/support-tickets.spec.ts). tk-009 to tk-020.
 */
export const RESOLVED_TEST_TICKETS = 12;

const BASE = Date.UTC(2026, 10, 10, 6, 0);
const at = (hoursAgo: number) => new Date(BASE - hoursAgo * 60 * 60 * 1000).toISOString();

interface Seed {
  subject: string;
  category: TicketCategory;
  awb: string | null;
  status: TicketStatus;
  body: string;
  /** The answer from support, when there is one. */
  answer?: string;
}

const LONG_SUBJECT =
  'Weight charge on DEMOLONGAWBTICKET001 looks wrong and the courier has not answered any of our four earlier messages';

// Newest first. tk-001 has a 20-character AWB and a 100-plus-character subject, so screens are
// tested with long values. Invented text, none of it real.
const SEEDS: Seed[] = [
  {
    subject: LONG_SUBJECT,
    category: 'weight',
    awb: 'DEMOLONGAWBTICKET001',
    status: 'awaiting_you',
    body: 'The courier charged for 12.5 kg but the parcel weighs 0.5 kg. Please look into it.',
    answer: 'Please send a photo of the parcel on a scale so we can raise this with the courier.',
  },
  {
    subject: 'Pickup missed for the second day',
    category: 'pickup',
    awb: null,
    status: 'open',
    body: 'The pickup booked for yesterday did not happen and nobody has called us.',
  },
  {
    subject: 'COD amount not in my last remittance',
    category: 'cod',
    awb: 'DEMOEK003',
    status: 'awaiting_you',
    body: 'The cash collected on this shipment is missing from the last remittance.',
    answer: 'Please tell us the remittance date you expected this amount on.',
  },
  {
    subject: 'Shipment stuck in transit',
    category: 'shipment',
    awb: 'DEMOEK002',
    status: 'open',
    body: 'This shipment has shown In transit for six days with no new scan.',
  },
  {
    subject: 'Invoice total differs from wallet debits',
    category: 'billing',
    awb: null,
    status: 'open',
    body: 'The October invoice total is higher than the debits shown in the wallet.',
  },
  {
    subject: 'Tracking page shows an old status',
    category: 'technical',
    awb: 'DEMOEK001',
    status: 'resolved',
    body: 'The tracking page still says Out for delivery after the parcel was delivered.',
    answer: 'The courier sent a late update. The status now shows Delivered.',
  },
  {
    subject: 'Question about the weight rules',
    category: 'other',
    awb: null,
    status: 'resolved',
    body: 'How is volumetric weight worked out for a box that is not square?',
    answer: 'It uses length times width times height divided by 5,000. See the Rate Calculator.',
  },
  {
    subject: 'Wrong pickup address on a booking',
    category: 'pickup',
    awb: 'DEMOEK004',
    status: 'resolved',
    body: 'The booking used an old pickup address. Please change it.',
    answer: 'We updated the pickup address and the courier has been told.',
  },
  ...Array.from(
    { length: RESOLVED_TEST_TICKETS },
    (_, n): Seed => ({
      subject: `Delivery date question ${n + 1}`,
      category: 'shipment',
      awb: `DEMOEK${100 + n}`,
      status: 'resolved',
      body: `Please confirm the delivery date for shipment number ${n + 1}.`,
      answer: 'The courier has confirmed the delivery date. Reply if you need anything else.',
    }),
  ),
];

export const SAMPLE_TICKETS: Ticket[] = SEEDS.map(({ body, answer, ...seed }, index) => {
  const updated = index * 9 + 2;
  const messages: Ticket['messages'] = [{ from: 'you', body, at: at(updated + (answer ? 5 : 0)) }];
  if (answer) messages.push({ from: 'support', body: answer, at: at(updated) });
  return { id: `tk-${String(index + 1).padStart(3, '0')}`, ...seed, updatedAt: at(updated), messages };
});

const copy = (ticket: Ticket): Ticket => ({
  ...ticket,
  messages: ticket.messages.map((message) => ({ ...message })),
});

const store: Ticket[] = SAMPLE_TICKETS.map(copy);
let counter = store.length;
let lastStamp = 0;

/** A fresh ISO time that is always later than the one before, so newest-first never ties. */
function now(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return new Date(lastStamp).toISOString();
}

function fail<T>(kind: ApiError['kind'], status: number, message: string): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

export const mockSupportService: SupportService = {
  async listTickets({ status, page }) {
    const found = store
      .filter((ticket) => !status || ticket.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const pageCount = Math.max(1, Math.ceil(found.length / TICKET_PAGE_SIZE));
    const current = Math.min(Math.max(page, 1), pageCount);
    const start = (current - 1) * TICKET_PAGE_SIZE;
    return fromMock({ items: found.slice(start, start + TICKET_PAGE_SIZE).map(copy), page: current, pageCount });
  },

  async getTicket(id) {
    const ticket = store.find((entry) => entry.id === id);
    return ticket ? fromMock(copy(ticket)) : fail('not_found', 404, 'Ticket not found.');
  },

  async createTicket(input) {
    const checked = checkTicket(input);
    if (!checked.ok) return fail('validation', 400, checked.message);

    const { body, ...details } = checked.value;
    counter += 1;
    const stamp = now();
    const ticket: Ticket = {
      id: `tk-${String(counter).padStart(3, '0')}`,
      ...details,
      status: 'open',
      updatedAt: stamp,
      messages: [{ from: 'you', body, at: stamp }],
    };
    store.push(ticket);
    return fromMock(copy(ticket));
  },

  async reply(id, body) {
    const checked = checkReply(body);
    if (!checked.ok) return fail('validation', 400, checked.message);

    const ticket = store.find((entry) => entry.id === id);
    if (!ticket) return fail('not_found', 404, 'Ticket not found.');

    const stamp = now();
    ticket.messages.push({ from: 'you', body: checked.value, at: stamp });
    // A reply always puts the ticket back with support, including one that was resolved.
    ticket.status = 'open';
    ticket.updatedAt = stamp;
    return fromMock(copy(ticket));
  },
};
