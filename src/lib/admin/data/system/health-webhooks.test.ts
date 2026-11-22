import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataResult } from '../../../data/source';
import { gatewayAdminSystemService, HEALTH_TIMEOUT_MS } from './gateway';
import { createMockAdminSystemService } from './mock';
import { seedMerchant } from '../seed';

function data<T>(result: DataResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
const errorKind = (result: DataResult<unknown>) => (result.ok ? null : result.error.kind);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('mock health', () => {
  it('checks every service now, and includes one that did not answer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
    const service = createMockAdminSystemService();
    const first = data(await service.getHealth());
    expect(first.every((entry) => entry.checkedAt === '2026-11-15T10:00:00.000Z')).toBe(true);
    expect(first.find((entry) => entry.latencyMs === null)).toMatchObject({ service: 'adapters', status: 'down' });

    vi.setSystemTime(new Date('2026-11-15T10:05:00Z'));
    expect(data(await service.getHealth())[0]!.checkedAt).toBe('2026-11-15T10:05:00.000Z');
  });
});

describe('mock webhook failures', () => {
  it('lists failed deliveries across merchants, newest attempt first', async () => {
    const list = data(await createMockAdminSystemService().listWebhookFailures());
    expect(new Set(list.map((entry) => entry.merchantId)).size).toBeGreaterThan(1);
    expect(list.every((entry) => entry.status === 'failed')).toBe(true);
    expect([...list].sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt))).toEqual(list);
  });

  it('takes each merchant name and webhook domain from the shared seed merchants', async () => {
    for (const entry of data(await createMockAdminSystemService().listWebhookFailures())) {
      const merchant = seedMerchant(entry.merchantId)!;
      expect(entry.merchantName).toBe(merchant.name);
      expect(new URL(entry.targetUrl).hostname).toBe(merchant.email.split('@')[1]);
    }
  });

  it('queues a retry once, and the row shows it', async () => {
    const service = createMockAdminSystemService();
    expect(data(await service.retryWebhookDelivery('whd_1b7c')).status).toBe('queued');
    expect(data(await service.listWebhookFailures()).find((entry) => entry.id === 'whd_1b7c')!.status).toBe('queued');
    const again = await service.retryWebhookDelivery('whd_1b7c');
    expect(errorKind(again)).toBe('conflict');
    expect(again.ok ? '' : again.error.message).toBe('This delivery is already queued to be sent again.');
  });

  it('refuses a deleted subscription and an unknown delivery, like the webhooks service', async () => {
    const service = createMockAdminSystemService();
    expect(errorKind(await service.retryWebhookDelivery('whd_4e08'))).toBe('conflict');
    expect(data(await service.listWebhookFailures()).find((entry) => entry.id === 'whd_4e08')!.status).toBe('failed');
    expect(errorKind(await service.retryWebhookDelivery('whd_nope'))).toBe('not_found');
  });

  it('keeps separate services separate', async () => {
    const one = createMockAdminSystemService();
    await one.retryWebhookDelivery('whd_1b7c');
    expect(data(await createMockAdminSystemService().listWebhookFailures()).every((entry) => entry.status === 'failed')).toBe(true);
  });
});

describe('gateway health', () => {
  const answer = (status: number, body: unknown) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it('calls the admin health route with a short timeout and keeps "no answer" services', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(
          JSON.stringify({
            services: [
              { service: 'gateway', status: 'up', latencyMs: 12, checkedAt: '2026-11-15T10:00:00Z' },
              { service: 'adapters', status: 'down', latencyMs: null, checkedAt: '2026-11-15T10:00:00Z' },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    const result = await gatewayAdminSystemService.getHealth();

    expect(result).toMatchObject({ ok: true, source: 'gateway' });
    expect(data(result)[1]).toMatchObject({ service: 'adapters', latencyMs: null });
    expect(String(fetch.mock.calls[0]![0])).toMatch(/\/api\/v1\/admin\/health$/);
    expect(timeout).toHaveBeenCalledWith(HEALTH_TIMEOUT_MS);
  });

  it('reports a timeout as its own error, so only the health card shows it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
      }),
    );
    expect(errorKind(await gatewayAdminSystemService.getHealth())).toBe('timeout');
  });

  it('reports a server error and an unexpected shape', async () => {
    answer(503, { message: 'down' });
    expect(errorKind(await gatewayAdminSystemService.getHealth())).toBe('unavailable');
    answer(200, { services: [{ service: 'gateway', status: 'fine' }] });
    expect(errorKind(await gatewayAdminSystemService.getHealth())).toBe('invalid_response');
  });

  it('lists failed deliveries and retries one', async () => {
    const failure = {
      id: 'd1',
      merchant_id: 'm1',
      merchant_name: 'Evoc',
      topic: 'shipment.status.updated',
      target_url: 'https://shop.example/hook',
      attempts: 8,
      last_http_status: 500,
      last_error: 'HTTP 500',
      last_attempt_at: '2026-11-22T00:00:00.000Z',
      status: 'failed',
      subscription_status: 'active',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/retry') ? Response.json({ id: 'd1', status: 'PENDING' }, { status: 202 }) : Response.json({ items: [{ ...failure, status: url.endsWith('/retry') ? 'queued' : 'failed' }] }),
      ),
    );
    expect(await gatewayAdminSystemService.listWebhookFailures()).toMatchObject({
      ok: true,
      data: [{ id: 'd1', merchantName: 'Evoc', lastHttpStatus: 500, status: 'failed' }],
    });
    expect(await gatewayAdminSystemService.retryWebhookDelivery('d1')).toMatchObject({ ok: true, data: { id: 'd1' } });
  });
});
