import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'demo-token' }));

import { gatewayRtoService } from './gateway';
import { rtoService } from './index';
import { mockRtoService } from './mock';

let handler: (req: IncomingMessage, res: ServerResponse) => void;
let server: Server;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const STATS = {
  CREATE_REQUESTED: 0,
  PICKUP_SCHEDULED: 1,
  MANIFESTED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  RTO_INITIATED: 6,
  RTO_DELIVERED: 7,
  CANCELLED: 0,
  FAILED: 0,
  stuck: 1,
};

beforeAll(async () => {
  server = createServer((req, res) => handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.GATEWAY_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  delete process.env.GATEWAY_URL;
});

afterEach(() => {
  delete process.env.DATA_SOURCE_RTO;
});

describe('mockRtoService', () => {
  it('counts the stages from its own list and gives a sample charge', async () => {
    const summary = await mockRtoService.getSummary();
    expect(summary).toMatchObject({ ok: true, source: 'mock' });
    if (!summary.ok) return;
    const inProgress = await mockRtoService.listRto({ stage: 'in_progress', page: 1 });
    const delivered = await mockRtoService.listRto({ stage: 'delivered', page: 1 });
    if (!inProgress.ok || !delivered.ok) throw new Error('mock list failed');
    expect(summary.data.inProgress).toBe(inProgress.data.total);
    expect(summary.data.delivered).toBe(delivered.data.total);
    expect(summary.data.rtoChargesPaise).toBeGreaterThan(0);
    expect(inProgress.data.items.every((i) => i.status === 'RTO_INITIATED')).toBe(true);
    expect(delivered.data.items.every((i) => i.status === 'RTO_DELIVERED')).toBe(true);
  });

  it('returns an empty page past the end', async () => {
    const result = await mockRtoService.listRto({ stage: 'delivered', page: 9 });
    expect(result).toMatchObject({ ok: true, data: { items: [], page: 9 } });
  });
});

describe('gatewayRtoService', () => {
  it('maps the delivered stage to RTO_DELIVERED', async () => {
    let url = '';
    let authorization = '';
    handler = (req, res) => {
      url = req.url ?? '';
      authorization = req.headers.authorization ?? '';
      json(res, 200, { items: [], page: 2, limit: 50, total: 0 });
    };

    const result = await gatewayRtoService.listRto({ stage: 'delivered', page: 2 });
    expect(result).toMatchObject({ ok: true, source: 'gateway' });
    expect(url).toBe('/api/v1/shipments?status=RTO_DELIVERED&page=2&limit=50');
    expect(authorization).toBe('Bearer demo-token');
  });

  it('maps the in progress stage to RTO_INITIATED', async () => {
    let url = '';
    handler = (req, res) => {
      url = req.url ?? '';
      json(res, 200, { items: [], page: 1, limit: 50, total: 0 });
    };
    await gatewayRtoService.listRto({ stage: 'in_progress', page: 1 });
    expect(url).toBe('/api/v1/shipments?status=RTO_INITIATED&page=1&limit=50');
  });

  it('counts RTO from stats', async () => {
    let url = '';
    let authorization = '';
    handler = (req, res) => {
      url = req.url ?? '';
      authorization = req.headers.authorization ?? '';
      json(res, 200, STATS);
    };

    const result = await gatewayRtoService.getSummary();
    expect(url).toBe('/api/v1/shipments/stats');
    expect(authorization).toBe('Bearer demo-token');
    expect(result).toEqual({
      ok: true,
      source: 'gateway',
      data: { inProgress: 6, delivered: 7, rtoChargesPaise: null },
    });
  });

  it('counts a status left out of the stats as zero', async () => {
    handler = (_req, res) => json(res, 200, { RTO_INITIATED: 3 });
    const result = await gatewayRtoService.getSummary();
    expect(result).toMatchObject({ ok: true, data: { inProgress: 3, delivered: 0 } });
  });

  it('returns the gateway error from either route', async () => {
    handler = (_req, res) => json(res, 401, { message: 'Unauthorized', statusCode: 401 });
    const list = await gatewayRtoService.listRto({ stage: 'in_progress', page: 1 });
    const summary = await gatewayRtoService.getSummary();
    expect(list).toMatchObject({ ok: false, source: 'gateway', error: { kind: 'unauthorized' } });
    expect(summary).toMatchObject({ ok: false, source: 'gateway', error: { kind: 'unauthorized' } });
  });
});

describe('rtoService', () => {
  it('uses the mock until DATA_SOURCE_RTO is gateway', () => {
    expect(rtoService()).toBe(mockRtoService);
    process.env.DATA_SOURCE_RTO = 'gateway';
    expect(rtoService()).toBe(gatewayRtoService);
  });
});
