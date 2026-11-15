import 'server-only';

import { fromMock, type DataResult } from '../../../data/source';
import { mockNotFound } from '../not-found';
import { daysAgo, SEED_MERCHANTS, seedMerchant } from '../seed';
import { cleanAuditEntry, filterAuditLog } from './audit';
import type { AdminSystemService, AuditEntry, ServiceHealth, WebhookFailure } from './types';

// The backend's services (Evoc_ships/services). Adapters did not answer in time: "No answer".
const HEALTH: Omit<ServiceHealth, 'checkedAt'>[] = [
  { service: 'gateway', status: 'up', latencyMs: 38 },
  { service: 'order-engine', status: 'up', latencyMs: 54 },
  { service: 'tracking-engine', status: 'up', latencyMs: 61 },
  { service: 'ledger-engine', status: 'up', latencyMs: 47 },
  { service: 'reconciliation', status: 'degraded', latencyMs: 912 },
  { service: 'webhooks', status: 'up', latencyMs: 43 },
  { service: 'adapters', status: 'down', latencyMs: null },
];

/** Invented failed deliveries, for merchants that ship (see the merchants sample data). */
function sampleWebhookFailures(): WebhookFailure[] {
  const rows: [id: string, merchantId: string, topic: string, url: string, attempts: number, http: number | null, error: string, hoursAgo: number, subscription: WebhookFailure['subscriptionStatus']][] = [
    ['whd_0f3a', 'mer_001', 'shipment.status.updated', 'https://kalpahome.example/hooks/evoc', 8, 503, 'Service Unavailable', 2, 'paused'],
    ['whd_1b7c', 'mer_003', 'shipment.delivered', 'https://urbanthread.example/api/webhooks', 8, null, 'Timed out after 10 seconds', 5, 'active'],
    ['whd_2c91', 'mer_005', 'cod.remitted', 'https://pixelgadgets.example/evoc/cod', 8, 401, 'Unauthorized: signature rejected', 9, 'active'],
    ['whd_3d44', 'mer_002', 'shipment.status.updated', 'https://neelgiri.example/webhook', 8, 404, 'Not Found', 20, 'active'],
    ['whd_4e08', 'mer_004', 'shipment.rto_initiated', 'https://sahyadri.example/hooks', 8, 500, 'Internal Server Error', 30, 'deleted'],
  ];
  return rows.map(([id, merchantId, topic, targetUrl, attempts, lastHttpStatus, lastError, hoursAgo, subscriptionStatus]) => ({
    id,
    merchantId,
    merchantName: seedMerchant(merchantId)!.name,
    topic,
    targetUrl,
    attempts,
    lastHttpStatus,
    lastError,
    lastAttemptAt: daysAgo(0, hoursAgo),
    status: 'failed',
    subscriptionStatus,
  }));
}

const conflict = (message: string): DataResult<never> => ({
  ok: false,
  source: 'mock',
  error: { kind: 'conflict', status: 409, message },
});

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
  const failures = sampleWebhookFailures();

  return {
    async getHealth() {
      // Checked now, so Refresh shows a new time.
      const checkedAt = new Date().toISOString();
      return fromMock(HEALTH.map((entry) => ({ ...entry, checkedAt })));
    },

    async listWebhookFailures() {
      return fromMock(failures.map((entry) => ({ ...entry })).sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt)));
    },

    async retryWebhookDelivery(id) {
      const delivery = failures.find((entry) => entry.id === id);
      if (!delivery) return mockNotFound('Delivery');
      if (delivery.subscriptionStatus === 'deleted') return conflict('The merchant deleted this webhook, so it cannot be sent again.');
      if (delivery.status === 'queued') return conflict('This delivery is already queued to be sent again.');
      delivery.status = 'queued';
      return fromMock({ ...delivery });
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

// The kept service outlives hot reloads in `pnpm dev`. When the code gains or loses a method, start a
// fresh one instead of serving the old shape ("… is not a function" until the server restarts).
let methods: string | undefined;
const methodsOf = (service: object) => Object.keys(service).sort().join();

export function mockAdminSystemService(): AdminSystemService {
  if (shared.evocMockAdminSystem) {
    methods ??= methodsOf(createMockAdminSystemService());
    if (methodsOf(shared.evocMockAdminSystem) === methods) return shared.evocMockAdminSystem;
  }
  shared.evocMockAdminSystem = createMockAdminSystemService();
  return shared.evocMockAdminSystem;
}
