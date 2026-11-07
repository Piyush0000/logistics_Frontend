import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ordersService } from './index';
import { fetchOrdersList } from './gateway';
import { mockOrdersService } from './mock';

let handler: (req: IncomingMessage, res: ServerResponse) => void;
let server: Server;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const SAMPLE_LIST = {
  items: [
    {
      shipment_id: '10000000-0000-4000-8000-000000000001',
      reference_id: 'DEMO-001',
      carrier: 'ekart',
      awb: 'DEMOEK001',
      status: 'IN_TRANSIT',
      created_at: '2026-10-23T08:00:00.000Z',
      last_status_at: '2026-10-23T10:00:00.000Z',
      stuck: false,
    },
  ],
  page: 1,
  limit: 50,
  total: 1,
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
  delete process.env.DATA_SOURCE_ORDERS;
});

describe('mockOrdersService', () => {
  it('returns mock orders list with source: mock', async () => {
    const result = await mockOrdersService.listOrders({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('mock');
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.total).toBeGreaterThan(0);
  });

  it('filters mock orders by status', async () => {
    const result = await mockOrdersService.listOrders({ status: 'DELIVERED' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const item of result.data.items) {
      expect(item.status).toBe('DELIVERED');
    }
  });

  it('filters mock orders by carrier', async () => {
    const result = await mockOrdersService.listOrders({ carrier: 'ekart' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const item of result.data.items) {
      expect(item.carrier).toBe('ekart');
    }
  });

  it('gets order detail by shipment_id or awb', async () => {
    const result = await mockOrdersService.getOrderDetail('DEMOEK001');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('mock');
    expect(result.data.awb).toBe('DEMOEK001');
    expect(result.data.origin).toBeDefined();
    expect(result.data.destination).toBeDefined();
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.timeline.length).toBeGreaterThan(0);
  });

  it('returns not found error for unknown order detail', async () => {
    const result = await mockOrdersService.getOrderDetail('UNKNOWN_AWB');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('not_found');
  });

  it('simulates shipment creation with valid inputs', async () => {
    const result = await mockOrdersService.createShipment({
      idempotency_key: 'idem-test-123456',
      reference_id: 'REF-TEST-001',
      origin: {
        name: 'Warehouse 1',
        phone: '9876543210',
        line1: '123 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'IN',
        pincode: '560001',
      },
      destination: {
        name: 'Rahul Sharma',
        phone: '9123456780',
        line1: '45 Park Street',
        city: 'Kolkata',
        state: 'West Bengal',
        country: 'IN',
        pincode: '700016',
      },
      weight_kg: 1.5,
      dimensions: {
        length_cm: 20,
        width_cm: 15,
        height_cm: 10,
      },
      items: [
        {
          name: 'Wireless Mouse',
          quantity: 1,
          unit_price: 999,
        },
      ],
      payment_type: 'PREPAID',
      cod_amount: 0,
      preferred_carrier: 'delhivery',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('mock');
    expect(result.data.awb).toMatch(/^DEMO/);
    expect(result.data.shipment_id).toBeDefined();
    expect(result.data.status).toBe('MANIFESTED');
  });
});

describe('fetchOrdersList (gateway)', () => {
  it('reads shipments list from the gateway with query params', async () => {
    let url = '';
    let auth = '';
    handler = (req, res) => {
      url = req.url ?? '';
      auth = req.headers.authorization ?? '';
      json(res, 200, SAMPLE_LIST);
    };

    const result = await fetchOrdersList({ status: 'IN_TRANSIT', page: 1, limit: 10 }, 'demo-merchant-001');

    expect(url).toContain('/api/v1/shipments?');
    expect(url).toContain('status=IN_TRANSIT');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=10');
    expect(auth).toBe('Bearer demo-merchant-001');
    expect(result).toMatchObject({
      ok: true,
      source: 'gateway',
      data: { total: 1 },
    });
  });

  it('handles gateway failure properly', async () => {
    handler = (_req, res) => json(res, 502, { error: 'UPSTREAM_UNAVAILABLE', service: 'shipment-read' });

    const result = await fetchOrdersList({}, 'demo-merchant-001');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.source).toBe('gateway');
    expect(result.error.kind).toBe('upstream');
  });
});

describe('ordersService resolution', () => {
  it('defaults to mock service when DATA_SOURCE_ORDERS is unset', () => {
    delete process.env.DATA_SOURCE_ORDERS;
    const service = ordersService();
    expect(service).toBe(mockOrdersService);
  });
});

