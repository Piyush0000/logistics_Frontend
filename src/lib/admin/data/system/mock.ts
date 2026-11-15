import 'server-only';

import { fromMock } from '../../../data/source';
import { daysAgo, SEED_MERCHANTS } from '../seed';
import { cleanAuditEntry, filterAuditLog } from './audit';
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

// Names come from the shared sample merchants, so they match every other admin page.
const merchant = (index: number) => {
  const { id, name } = SEED_MERCHANTS[index % SEED_MERCHANTS.length] ?? SEED_MERCHANTS[0]!;
  return `${id} · ${name}`;
};

/** Invented history, newest first. */
function sampleAudit(): AuditEntry[] {
  const rows: [number, number, string, string, string][] = [
    [0, 1, 'Approved KYC', merchant(4), 'All three documents verified.'],
    [0, 6, 'Wallet credit', merchant(1), '₹1,200.00 goodwill credit for a lost parcel.'],
    [1, 2, 'Suspended merchant', merchant(3), 'Wallet below zero for 14 days.'],
    [1, 9, 'Sent KYC reminder', merchant(7), 'Signed up five days ago with no documents yet.'],
    [2, 4, 'Courier disabled', 'dhl', 'Paused new bookings during the rate review.'],
    [2, 8, 'Wallet debit', merchant(0), '₹350.00 weight discrepancy recovery.'],
    [3, 3, 'COD reconciled', 'delhivery · batch 41', '58 orders matched, no difference.'],
    [3, 11, 'Rate card updated', 'bluedart · zone D', 'Each extra 500 g ₹28.00 → ₹30.00.'],
    [4, 0, 'Rate card updated', 'ekart · zone C', 'Base ₹42.00 → ₹43.00.'],
    [5, 5, 'Courier enabled', 'shadowfax', 'Rate review finished.'],
    [6, 2, 'Reactivated merchant', merchant(2), 'Wallet back above zero.'],
    [7, 7, 'Wallet credit', merchant(5), '₹500.00 first-month welcome credit.'],
    [9, 1, 'Approved KYC', merchant(1), 'Documents verified on a video call.'],
    [12, 4, 'Webhook retried', merchant(0), 'shipment.status.updated delivery sent again.'],
  ];
  return rows.map(([days, hours, action, target, detail], index) => ({
    id: `aud_${String(rows.length - index).padStart(3, '0')}`,
    at: daysAgo(days, hours),
    action,
    target,
    detail,
  }));
}

/** A fresh sample service. Its log keeps new entries until the server restarts. */
export function createMockAdminSystemService(): AdminSystemService {
  const audit = sampleAudit();
  let nextId = audit.length + 1;

  return {
    async getHealth() {
      return fromMock(HEALTH);
    },
    async listAuditLog(filters) {
      return fromMock(filterAuditLog(audit, filters));
    },
    async recordAudit(entry) {
      audit.unshift({
        ...cleanAuditEntry(entry),
        id: `aud_${String(nextId++).padStart(3, '0')}`,
        at: new Date().toISOString(),
      });
      return fromMock(undefined);
    },
  };
}

// Kept on globalThis so every page and server action in this server sees the same log.
const shared = globalThis as typeof globalThis & { evocMockAdminSystem?: AdminSystemService };

export function mockAdminSystemService(): AdminSystemService {
  shared.evocMockAdminSystem ??= createMockAdminSystemService();
  return shared.evocMockAdminSystem;
}
