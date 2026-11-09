import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WEBHOOK_EVENTS, samplePayload } from './events';
import {
  createWebhook,
  deleteWebhook,
  fetchDeliveries,
  fetchWebhooks,
  retryDeliveryRequest,
  updateWebhook,
} from './gateway';
import { createMockWebhookService, DELIVERY_PAGE_SIZE } from './mock';
import { webhookService } from '.';

const input = { url: 'https://hooks.example.com/in', events: ['shipment.created'] };

describe('sample webhooks', () => {
  it('are labelled as sample data, with no secret in the list', async () => {
    const result = await createMockWebhookService().list();

    expect(result.source).toBe('mock');
    expect(result.ok && result.data.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain('whsec_');
  });

  it('show the secret only in the create result', async () => {
    const service = createMockWebhookService();

    const created = await service.create(input);
    const listed = await service.list();

    expect(created.ok && created.data.secret).toMatch(/^whsec_sample_/);
    expect(JSON.stringify(listed)).not.toContain('whsec_');
  });

  it('keep what is created, changed and removed', async () => {
    const service = createMockWebhookService();
    const created = await service.create(input);
    if (!created.ok) throw new Error('Create should work');
    const { id } = created.data;

    await service.update(id, { url: 'https://hooks.example.com/new', events: input.events });
    let listed = await service.list();
    expect(listed.ok && listed.data.find((hook) => hook.id === id)?.url).toBe(
      'https://hooks.example.com/new',
    );

    await service.remove(id);
    listed = await service.list();
    expect(listed.ok && listed.data.some((hook) => hook.id === id)).toBe(false);
  });

  it('report an unknown webhook', async () => {
    const service = createMockWebhookService();

    expect(await service.update('missing', input)).toMatchObject({
      ok: false,
      error: { kind: 'not_found' },
    });
    expect(await service.remove('missing')).toMatchObject({ ok: false });
  });

  it('do not share changes between service instances', async () => {
    await createMockWebhookService().create(input);

    const listed = await createMockWebhookService().list();

    expect(listed.ok && listed.data.some(({ url }) => url === input.url)).toBe(false);
  });
});

describe('sample deliveries', () => {
  it('come in pages, newest first', async () => {
    const service = createMockWebhookService();

    const first = await service.listDeliveries();
    if (!first.ok) throw new Error('Deliveries should work');
    expect(first.data.items).toHaveLength(DELIVERY_PAGE_SIZE);
    expect(first.data.nextCursor).not.toBeNull();

    const second = await service.listDeliveries(first.data.nextCursor ?? undefined);
    if (!second.ok) throw new Error('Deliveries should work');
    expect(second.data.items[0]?.id).not.toBe(first.data.items[0]?.id);
    expect(second.data.nextCursor).toBeNull();

    const times = [...first.data.items, ...second.data.items].map(({ createdAt }) =>
      Date.parse(createdAt),
    );
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('retry a failed delivery once', async () => {
    const service = createMockWebhookService();
    const all = await service.listDeliveries();
    const failed = all.ok ? all.data.items.find(({ status }) => status === 'FAILED') : undefined;
    if (!failed) throw new Error('The sample needs a failed delivery');

    expect((await service.retryDelivery(failed.id)).ok).toBe(true);

    const after = await service.listDeliveries();
    expect(after.ok && after.data.items.find(({ id }) => id === failed.id)?.status).toBe('PENDING');
    expect(await service.retryDelivery(failed.id)).toMatchObject({
      ok: false,
      error: { kind: 'conflict' },
    });
  });
});

describe('sample payloads', () => {
  it('follow the backend format for every event', () => {
    for (const { value } of WEBHOOK_EVENTS) {
      const payload = samplePayload(value);

      expect(payload).toMatchObject({ type: value, api_version: '2026-10-01' });
      expect(payload.data.order_id).toBeTruthy();
      expect(JSON.stringify(payload)).toContain('DEMO');
    }
  });
});

describe('webhookService', () => {
  it('uses sample data until switched', async () => {
    expect((await webhookService().list()).source).toBe('mock');
  });
});

describe('gateway webhooks', () => {
  let handler: (req: IncomingMessage, res: ServerResponse, body: string) => void;
  let server: Server;
  const seen: { method?: string; url?: string; auth?: string; body: string }[] = [];

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const SUBSCRIPTION = {
    id: '10000000-0000-4000-8000-000000000001',
    url: 'https://hooks.example.com/in',
    events: ['shipment.created'],
    status: 'ACTIVE',
    failure_started_at: null,
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T10:00:00.000Z',
  };

  const DELIVERY = {
    id: '20000000-0000-4000-8000-000000000001',
    event_id: '30000000-0000-4000-8000-000000000001',
    topic: 'shipment.failed',
    status: 'FAILED',
    target_url: 'https://hooks.example.com/in',
    attempt_count: 3,
    next_attempt_at: null,
    created_at: '2026-10-01T10:00:00.000Z',
    subscription_status: 'ACTIVE',
    last_attempt: {
      started_at: '2026-10-01T10:05:00.000Z',
      http_status: 500,
      outcome: 'FAILED',
      error: 'HTTP 500',
    },
  };

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
        handler(req, res, body);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    process.env.GATEWAY_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => {
    seen.length = 0;
  });

  afterAll(async () => {
    delete process.env.GATEWAY_URL;
    await new Promise((resolve) => server.close(resolve));
  });

  it('lists webhooks with the merchant key', async () => {
    handler = (_req, res) => json(res, 200, [SUBSCRIPTION]);

    const result = await fetchWebhooks('merchant-key');

    expect(seen[0]).toMatchObject({ url: '/api/v1/webhooks', auth: 'Bearer merchant-key' });
    expect(result).toEqual({
      ok: true,
      source: 'gateway',
      data: [
        {
          id: SUBSCRIPTION.id,
          url: SUBSCRIPTION.url,
          events: SUBSCRIPTION.events,
          status: 'ACTIVE',
          failureStartedAt: null,
          createdAt: SUBSCRIPTION.created_at,
          updatedAt: SUBSCRIPTION.updated_at,
        },
      ],
    });
  });

  it('rejects a response of the wrong shape', async () => {
    handler = (_req, res) => json(res, 200, [{ id: 1 }]);

    expect(await fetchWebhooks('key')).toMatchObject({
      ok: false,
      error: { kind: 'invalid_response' },
    });
  });

  it('creates a webhook and returns its one-time secret', async () => {
    handler = (_req, res) => json(res, 201, { ...SUBSCRIPTION, secret: 'whsec_abc' });

    const result = await createWebhook(input, 'key');

    expect(seen[0]).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
    expect(result).toMatchObject({ ok: true, data: { secret: 'whsec_abc', id: SUBSCRIPTION.id } });
  });

  it('passes on the field problems the backend finds', async () => {
    handler = (_req, res) =>
      json(res, 400, {
        error: 'VALIDATION_FAILED',
        issues: [{ path: 'url', message: 'url must be a public HTTPS address' }],
      });

    expect(await createWebhook(input, 'key')).toMatchObject({
      ok: false,
      error: { kind: 'validation', issues: [{ path: 'url' }] },
    });
  });

  it('updates a webhook, keeping the id safe in the path', async () => {
    handler = (_req, res) => json(res, 200, SUBSCRIPTION);

    await updateWebhook('a/b', input, 'key');

    expect(seen[0]).toMatchObject({ method: 'PATCH', url: '/api/v1/webhooks/a%2Fb' });
  });

  it('deletes a webhook, which answers with no body', async () => {
    handler = (_req, res) => {
      res.writeHead(204);
      res.end();
    };

    const result = await deleteWebhook(SUBSCRIPTION.id, 'key');

    expect(seen[0]?.method).toBe('DELETE');
    expect(result).toMatchObject({ ok: true, source: 'gateway' });
  });

  it('lists deliveries with paging', async () => {
    handler = (_req, res) => json(res, 200, { items: [DELIVERY], next_cursor: 'abc' });

    const result = await fetchDeliveries('cursor-1', 'key');

    expect(seen[0]?.url).toBe('/api/v1/webhooks/deliveries?limit=10&cursor=cursor-1');
    expect(result).toMatchObject({
      ok: true,
      data: {
        nextCursor: 'abc',
        items: [
          {
            id: DELIVERY.id,
            topic: 'shipment.failed',
            status: 'FAILED',
            targetUrl: DELIVERY.target_url,
            attemptCount: 3,
            lastAttempt: { httpStatus: 500, error: 'HTTP 500' },
          },
        ],
      },
    });
  });

  it('uses the merchant retry route, never the support one', async () => {
    handler = (_req, res) => json(res, 202, { id: DELIVERY.id, status: 'PENDING' });

    const result = await retryDeliveryRequest(DELIVERY.id, 'key');

    expect(seen[0]).toMatchObject({
      method: 'POST',
      url: `/api/v1/webhooks/deliveries/${DELIVERY.id}/retry/merchant`,
    });
    expect(result.ok).toBe(true);
  });
});
