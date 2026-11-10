import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchTimeline } from './gateway';

let handler: (req: IncomingMessage, res: ServerResponse) => void;
let server: Server;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

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

describe('fetchTimeline (gateway)', () => {
  it('getTimeline orders events newest first and maps names', async () => {
    let url = '';
    handler = (req, res) => {
      url = req.url ?? '';
      json(res, 200, {
        shipment_id: '10000000-0000-4000-8000-000000000001',
        awb: 'LIVE123',
        carrier: 'ekart',
        status: 'DELIVERED',
        raw_status: 'Delivered',
        last_event_at: '2026-10-23T10:00:00.000Z',
        stuck: false,
        timeline: [
          {
            event_id: '1',
            status: 'IN_TRANSIT',
            raw_status: 'In Transit',
            location: 'Pune',
            occurred_at: '2026-10-22T09:00:00.000Z',
            source: 'webhook',
          },
          {
            event_id: '2',
            status: 'DELIVERED',
            raw_status: 'Delivered',
            location: null,
            occurred_at: '2026-10-23T10:00:00.000Z',
            source: 'webhook',
          },
        ],
      });
    };

    const result = await fetchTimeline('LIVE123', null);

    expect(url).toBe('/api/v1/shipments/LIVE123/tracking');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('gateway');
    expect(result.data.awb).toBe('LIVE123');
    expect(result.data.rawStatus).toBe('Delivered');
    expect(result.data.location).toBe('Pune');
    expect(result.data.timeline).toEqual([
      { status: 'DELIVERED', rawStatus: 'Delivered', location: null, occurredAt: '2026-10-23T10:00:00.000Z' },
      { status: 'IN_TRANSIT', rawStatus: 'In Transit', location: 'Pune', occurredAt: '2026-10-22T09:00:00.000Z' },
    ]);
  });

  it('getTimeline 404 says no shipment found', async () => {
    handler = (_req, res) =>
      json(res, 404, { message: 'Tracking timeline not found for: X', statusCode: 404 });

    const result = await fetchTimeline('X', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('not_found');
    expect(result.error.message).toBe('No shipment found for this AWB.');
  });
});
