import { randomBytes, randomUUID } from 'node:crypto';
import { fromMock, type DataResult } from '../source';
import type { ApiError } from '../../gateway/errors';
import type { Webhook, WebhookDelivery, WebhookService } from './types';

export const DELIVERY_PAGE_SIZE = 10;

const NEWEST = Date.parse('2026-10-29T10:30:00Z');
const HOUR_MS = 60 * 60 * 1000;
const ORDERS_URL = 'https://hooks.example.com/demo-orders';
const ALERTS_URL = 'https://hooks.example.com/demo-alerts';

const sampleId = (group: number, index: number) =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`;

const sampleWebhooks = (): Webhook[] => [
  {
    id: sampleId(1, 1),
    url: ORDERS_URL,
    events: ['shipment.created', 'shipment.status.updated'],
    status: 'ACTIVE',
    failureStartedAt: null,
    createdAt: '2026-09-02T09:00:00.000Z',
    updatedAt: '2026-09-02T09:00:00.000Z',
  },
  {
    id: sampleId(1, 2),
    url: ALERTS_URL,
    events: ['shipment.failed'],
    status: 'PAUSED',
    failureStartedAt: '2026-10-28T08:00:00.000Z',
    createdAt: '2026-09-15T09:00:00.000Z',
    updatedAt: '2026-10-28T08:00:00.000Z',
  },
];

const TOPICS = ['shipment.status.updated', 'shipment.created', 'shipment.failed'];

function sampleDelivery(index: number): WebhookDelivery {
  const failed = index % 4 === 1;
  const pending = index === 2;
  const startedAt = new Date(NEWEST - index * HOUR_MS).toISOString();

  return {
    id: sampleId(2, index + 1),
    topic: TOPICS[index % TOPICS.length] ?? 'shipment.created',
    status: failed ? 'FAILED' : pending ? 'PENDING' : 'DELIVERED',
    targetUrl: failed ? ALERTS_URL : ORDERS_URL,
    attemptCount: failed ? 3 : 1,
    nextAttemptAt: pending ? new Date(NEWEST + HOUR_MS).toISOString() : null,
    createdAt: startedAt,
    subscriptionStatus: failed ? 'PAUSED' : 'ACTIVE',
    lastAttempt: {
      startedAt,
      httpStatus: failed ? 500 : pending ? 503 : 200,
      outcome: failed || pending ? 'FAILED' : 'DELIVERED',
      error: failed || pending ? 'The address answered with an error.' : null,
    },
  };
}

function failure(kind: ApiError['kind'], status: number, message: string): DataResult<never> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

const NOT_FOUND = 'This webhook no longer exists.';

/** Sample webhooks that remember changes until the server restarts. */
export function createMockWebhookService(): WebhookService {
  let webhooks = sampleWebhooks();
  const deliveries = Array.from({ length: 13 }, (_, index) => sampleDelivery(index));

  return {
    async list() {
      return fromMock(webhooks.map((webhook) => ({ ...webhook })));
    },

    async create(input) {
      const now = new Date().toISOString();
      const webhook: Webhook = {
        id: randomUUID(),
        url: input.url,
        events: input.events,
        status: 'ACTIVE',
        failureStartedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      webhooks = [webhook, ...webhooks];
      return fromMock({
        ...webhook,
        secret: `whsec_sample_${randomBytes(18).toString('base64url')}`,
      });
    },

    async update(id, input) {
      const existing = webhooks.find((webhook) => webhook.id === id);
      if (!existing) return failure('not_found', 404, NOT_FOUND);

      const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
      webhooks = webhooks.map((webhook) => (webhook.id === id ? updated : webhook));
      return fromMock(updated);
    },

    async remove(id) {
      if (!webhooks.some((webhook) => webhook.id === id)) {
        return failure('not_found', 404, NOT_FOUND);
      }
      webhooks = webhooks.filter((webhook) => webhook.id !== id);
      return fromMock(undefined);
    },

    async listDeliveries(cursor) {
      const start = cursor ? deliveries.findIndex(({ id }) => id === cursor) + 1 : 0;
      const items = deliveries.slice(start, start + DELIVERY_PAGE_SIZE);
      const more = start + DELIVERY_PAGE_SIZE < deliveries.length;
      return fromMock({
        items: items.map((item) => ({ ...item })),
        nextCursor: more ? (items.at(-1)?.id ?? null) : null,
      });
    },

    async retryDelivery(id) {
      const delivery = deliveries.find((item) => item.id === id);
      if (!delivery) return failure('not_found', 404, 'Delivery not found');
      if (delivery.status !== 'FAILED') {
        return failure('conflict', 409, 'Only failed deliveries can be retried.');
      }
      delivery.status = 'PENDING';
      return fromMock(undefined);
    },
  };
}

// Kept on globalThis so the page and its server actions see the same sample data.
const shared = globalThis as typeof globalThis & { evocMockWebhooks?: WebhookService };

export function mockWebhookService(): WebhookService {
  shared.evocMockWebhooks ??= createMockWebhookService();
  return shared.evocMockWebhooks;
}
