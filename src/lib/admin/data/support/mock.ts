import 'server-only';

import { fromMock } from '../../../data/source';
import { daysAgo, seedMerchant } from '../seed';
import type { AdminSupportService, AdminTicket } from './types';

const ticket = (
  id: string,
  merchantId: string,
  subject: string,
  category: string,
  status: AdminTicket['status'],
  priority: AdminTicket['priority'],
  hoursAgo: number,
): AdminTicket => ({
  id,
  merchantId,
  merchantName: seedMerchant(merchantId)?.name ?? merchantId,
  subject,
  category,
  status,
  priority,
  updatedAt: daysAgo(0, hoursAgo),
});

const TICKETS: AdminTicket[] = [
  ticket('TK-2041', 'mer_003', 'COD payout for 3 Nov not received', 'Billing', 'open', 'high', 2),
  ticket('TK-2039', 'mer_001', 'Weight dispute on 6 AWBs from Ekart', 'Shipping', 'open', 'normal', 5),
  ticket('TK-2036', 'mer_005', 'Need a second pickup address in Noida', 'Account', 'awaiting_merchant', 'low', 20),
  ticket('TK-2030', 'mer_002', 'Webhook deliveries failing since morning', 'Integrations', 'open', 'high', 26),
  ticket('TK-2024', 'mer_004', 'Why is my account suspended?', 'Account', 'awaiting_merchant', 'normal', 50),
  ticket('TK-2011', 'mer_001', 'Label printing cut off on A6', 'Shipping', 'resolved', 'low', 120),
];

export const mockAdminSupportService: AdminSupportService = {
  async listTickets(status) {
    return fromMock(TICKETS.filter((entry) => !status || entry.status === status));
  },
};
