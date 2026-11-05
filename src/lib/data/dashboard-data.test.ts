import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { overviewService } from './overview';
import { fetchShipmentSummary } from './shipments/gateway';
import { mockShipmentService } from './shipments/mock';
import { toShipmentSummary } from './shipments/summary';
import { fetchTracking } from './tracking/gateway';
import { mockTrackingService } from './tracking/mock';
import { walletService } from './wallet';

let handler: (req: IncomingMessage, res: ServerResponse) => void;
let server: Server;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const STATS = {
  PICKUP_SCHEDULED: 1,
  MANIFESTED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  RTO_INITIATED: 6,
  RTO_DELIVERED: 7,
  CANCELLED: 8,
  FAILED: 9,
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
  delete process.env.DATA_SOURCE_OVERVIEW;
  delete process.env.DATA_SOURCE_WALLET;
});

describe('toShipmentSummary', () => {
  it('maps backend statuses to the dashboard tiles', () => {
    expect(toShipmentSummary(STATS)).toEqual({
      toBeProcessed: 1,
      readyToShip: 2,
      inTransit: 3,
      outForDelivery: 4,
      delivered: 5,
      rto: 13,
    });
  });
});

describe('fetchShipmentSummary', () => {
  it('reads stats from the gateway with the merchant token', async () => {
    let url = '';
    let authorization = '';
    handler = (req, res) => {
      url = req.url ?? '';
      authorization = req.headers.authorization ?? '';
      json(res, 200, STATS);
    };

    const result = await fetchShipmentSummary('demo-merchant-001');

    expect(url).toBe('/api/v1/shipments/stats');
    expect(authorization).toBe('Bearer demo-merchant-001');
    expect(result).toMatchObject({ ok: true, source: 'gateway', data: { rto: 13 } });
  });

  it('treats statuses missing from the response as zero', async () => {
    handler = (_req, res) => json(res, 200, { DELIVERED: 5 });

    const result = await fetchShipmentSummary('token');

    expect(result).toMatchObject({ ok: true, data: { delivered: 5, inTransit: 0 } });
  });

  it('passes on a gateway error', async () => {
    handler = (_req, res) => json(res, 401, { message: 'Unauthorized', statusCode: 401 });

    const result = await fetchShipmentSummary(null);

    expect(result).toMatchObject({ ok: false, source: 'gateway', error: { kind: 'unauthorized' } });
  });
});

describe('fetchTracking', () => {
  const tracking = {
    shipment_id: 'id',
    awb: 'AWB/1',
    carrier: 'ekart',
    status: 'IN_TRANSIT',
    raw_status: 'In Transit',
    last_event_at: '2026-10-23T10:00:00.000Z',
    stuck: false,
    timeline: [
      { event_id: '1', status: 'MANIFESTED', raw_status: 'x', location: null, occurred_at: 'a', source: 's' },
      { event_id: '2', status: 'IN_TRANSIT', raw_status: 'y', location: 'Pune', occurred_at: 'b', source: 's' },
    ],
  };

  it('encodes the AWB and returns the latest location', async () => {
    let url = '';
    handler = (req, res) => {
      url = req.url ?? '';
      json(res, 200, tracking);
    };

    const result = await fetchTracking('AWB/1', 'token');

    expect(url).toBe('/api/v1/shipments/AWB%2F1/tracking');
    expect(result).toEqual({
      ok: true,
      source: 'gateway',
      data: {
        awb: 'AWB/1',
        carrier: 'ekart',
        status: 'IN_TRANSIT',
        rawStatus: 'In Transit',
        location: 'Pune',
        lastEventAt: '2026-10-23T10:00:00.000Z',
      },
    });
  });

  it('reports an unknown AWB in plain words', async () => {
    handler = (_req, res) => json(res, 404, { message: 'Not Found', statusCode: 404 });

    const result = await fetchTracking('NOPE', 'token');

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'not_found', message: 'No shipment found for this AWB.' },
    });
  });
});

describe('mock services', () => {
  it('labels shipment data as sample data', async () => {
    expect(await mockShipmentService.getSummary()).toMatchObject({ ok: true, source: 'mock' });
  });

  it('finds a sample AWB', async () => {
    expect(await mockTrackingService.lookup('DEMOEK001')).toMatchObject({
      ok: true,
      source: 'mock',
      data: { status: 'IN_TRANSIT' },
    });
  });

  it('does not invent a result for an unknown AWB', async () => {
    expect(await mockTrackingService.lookup('NOPE')).toMatchObject({
      ok: false,
      error: { kind: 'not_found', message: 'No shipment found for this AWB.' },
    });
  });
});

describe('features with no gateway route yet', () => {
  it('reports the overview as unavailable instead of showing sample data as real', async () => {
    process.env.DATA_SOURCE_OVERVIEW = 'gateway';

    expect(await overviewService().getOverview()).toMatchObject({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable' },
    });
  });

  it('reports the wallet as unavailable', async () => {
    process.env.DATA_SOURCE_WALLET = 'gateway';

    expect(await walletService().getBalance()).toMatchObject({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable' },
    });
  });
});
