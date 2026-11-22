import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewayApiKeyService } from './gateway';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));
afterEach(() => vi.unstubAllGlobals());

const key = { id: 'k1', name: 'Shopify', prefix: 'evs_live_abc123', created_at: '2026-11-22T00:00:00.000Z', last_used_at: null };

describe('gateway API keys', () => {
  it('lists, creates (full key once) and revokes', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (_url, init) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (init?.method === 'POST') return Response.json({ ...key, key: 'evs_live_secret' });
      return Response.json({ items: [key] });
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await gatewayApiKeyService.list()).toMatchObject({ ok: true, data: [{ id: 'k1', prefix: 'evs_live_abc123', lastUsedAt: null }] });
    expect(await gatewayApiKeyService.create('Shopify')).toMatchObject({ ok: true, data: { key: 'evs_live_secret' } });
    expect(await gatewayApiKeyService.revoke('k1')).toMatchObject({ ok: true, data: null });
    expect(fetchMock.mock.calls.map(([url, init]) => [init?.method ?? 'GET', new URL(url).pathname])).toEqual([
      ['GET', '/api/v1/auth/api-keys'],
      ['POST', '/api/v1/auth/api-keys'],
      ['DELETE', '/api/v1/auth/api-keys/k1'],
    ]);
  });
});
