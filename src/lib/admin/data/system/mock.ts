import 'server-only';

import { fromMock } from '../../../data/source';
import { daysAgo } from '../seed';
import type { AdminSystemService, AuditEntry, ServiceHealth } from './types';

// The backend's services (Evoc_ships/services), as the system page will check them.
const HEALTH: ServiceHealth[] = [
  { service: 'gateway', status: 'up', latencyMs: 38 },
  { service: 'order-engine', status: 'up', latencyMs: 54 },
  { service: 'tracking-engine', status: 'up', latencyMs: 61 },
  { service: 'ledger-engine', status: 'up', latencyMs: 47 },
  { service: 'reconciliation', status: 'degraded', latencyMs: 912 },
  { service: 'webhooks', status: 'up', latencyMs: 43 },
].map((entry) => ({ ...entry, status: entry.status as ServiceHealth['status'], checkedAt: daysAgo(0) }));

const AUDIT: AuditEntry[] = [
  { id: 'aud_06', at: daysAgo(0, 1), action: 'Approved KYC', target: 'mer_005 · Pixel Gadgets', detail: 'All three documents verified.' },
  { id: 'aud_05', at: daysAgo(0, 6), action: 'Wallet credit', target: 'mer_002 · Neelgiri Teas', detail: '₹1,200.00 goodwill credit for a lost parcel.' },
  { id: 'aud_04', at: daysAgo(1, 2), action: 'Suspended merchant', target: 'mer_004 · Sahyadri Organics', detail: 'Wallet below zero for 14 days.' },
  { id: 'aud_03', at: daysAgo(2, 4), action: 'Courier disabled', target: 'dhl', detail: 'Paused new bookings during the rate review.' },
  { id: 'aud_02', at: daysAgo(4, 0), action: 'Rate card updated', target: 'ekart · zone C', detail: 'Base ₹42.00 → ₹43.00.' },
];

export const mockAdminSystemService: AdminSystemService = {
  async getHealth() {
    return fromMock(HEALTH);
  },
  async listAuditLog() {
    return fromMock(AUDIT);
  },
};
