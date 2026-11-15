import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BULK_COLUMNS } from '@/lib/bulk-shipments';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const orders = vi.hoisted(() => ({ createShipment: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/orders', () => ({ ordersService: () => orders }));

import { previewBulkAction, submitBulkAction } from './actions';

const valid = {
  idempotency_key: 'bulk-abc12345-2',
  origin: {
    name: 'Central Hub',
    phone: '9876543210',
    line1: '1 Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'IN',
    pincode: '411001',
  },
  destination: {
    name: 'Aditi Rao',
    phone: '9988776655',
    line1: '2 Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'IN',
    pincode: '411002',
  },
  weight_kg: 1,
  dimensions: { length_cm: 10, width_cm: 10, height_cm: 10 },
  items: [{ name: 'Item', quantity: 1, unit_price: 100 }],
  payment_type: 'PREPAID',
  cod_amount: 0,
};

const created = {
  ok: true,
  source: 'mock',
  data: { shipment_id: 'ship-1', awb: 'AWB1', reference_id: 'R', carrier: 'delhivery', status: 'MANIFESTED' },
};

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  orders.createShipment.mockReset();
});

describe('signed out', () => {
  beforeEach(() => {
    session.current = null;
  });

  it('refuses a signed-out preview', async () => {
    expect(await previewBulkAction(BULK_COLUMNS.join(','))).toEqual({ ok: false, message: 'Sign in again.' });
  });

  it('refuses a signed-out submit and books nothing', async () => {
    expect(await submitBulkAction([{ line: 2, input: valid }])).toEqual({
      ok: false,
      message: 'Sign in again.',
    });
    expect(orders.createShipment).not.toHaveBeenCalled();
  });
});

describe('previewBulkAction', () => {
  it('keys the file by the SHA-256 of its text', async () => {
    const text = `${BULK_COLUMNS.join(',')}\r\nCentral Hub,9876543210,1 Road,Pune,Maharashtra,411001,Aditi,9988776655,2 Road,,Pune,Maharashtra,411002,1,10,10,10,Item,1,100,PREPAID,0,R1,\r\n`;
    const result = await previewBulkAction(text);
    const key = createHash('sha256').update(text).digest('hex');
    expect(result.ok && result.rows[0]?.input?.idempotency_key).toBe(`bulk-${key}-2`);
    const again = await previewBulkAction(text);
    expect(again).toEqual(result);
  });

  it('refuses text over 1 MB', async () => {
    expect(await previewBulkAction('a'.repeat(1024 * 1024 + 1))).toEqual({
      ok: false,
      message: 'The file is larger than 1 MB.',
    });
  });

  it('passes the column message through', async () => {
    expect(await previewBulkAction('a,b')).toEqual({
      ok: true,
      rows: [],
      fatal: "The file's columns don't match the template.",
    });
  });
});

describe('submitBulkAction', () => {
  it('books each row in order and reports each result', async () => {
    orders.createShipment
      .mockResolvedValueOnce(created)
      .mockResolvedValueOnce({ ...created, data: { ...created.data, shipment_id: 'ship-2', awb: null } })
      .mockResolvedValueOnce({
        ok: false,
        source: 'gateway',
        error: { kind: 'unavailable', status: 503, message: 'Shipment creation is disabled' },
      });
    const rows = [2, 3, 4].map((line) => ({ line, input: valid }));
    const result = await submitBulkAction(rows);
    expect(result).toEqual({
      ok: true,
      results: [
        { line: 2, ok: true, message: 'AWB AWB1', shipmentId: 'ship-1' },
        { line: 3, ok: true, message: 'AWB pending', shipmentId: 'ship-2' },
        {
          line: 4,
          ok: false,
          message: 'Booking is not available yet: Shipment creation is disabled',
          shipmentId: null,
        },
      ],
    });
    expect(orders.createShipment).toHaveBeenCalledTimes(3);
  });

  it('checks every row again and refuses invalid ones without stopping', async () => {
    orders.createShipment.mockResolvedValue(created);
    const bad = { ...valid, destination: { ...valid.destination, pincode: '012345' } };
    const result = await submitBulkAction([
      { line: 2, input: bad },
      { line: 3, input: 'not an object' },
      { line: 4, input: valid },
    ]);
    expect(result.ok && result.results.map((r) => [r.line, r.ok])).toEqual([
      [2, false],
      [3, false],
      [4, true],
    ]);
    expect(orders.createShipment).toHaveBeenCalledTimes(1);
  });

  it('never forwards a merchant id from the browser', async () => {
    orders.createShipment.mockResolvedValue(created);
    await submitBulkAction([{ line: 2, input: { ...valid, merchant_id: 'someone-else' } }]);
    const sent = orders.createShipment.mock.calls[0]?.[0];
    expect(sent).toBeDefined();
    expect('merchant_id' in sent).toBe(false);
    expect(sent.idempotency_key).toBe('bulk-abc12345-2');
  });

  it('refuses an empty list and more than 200 rows', async () => {
    expect(await submitBulkAction([])).toMatchObject({ ok: false });
    const many = Array.from({ length: 201 }, (_, i) => ({ line: i + 2, input: valid }));
    expect(await submitBulkAction(many)).toEqual({
      ok: false,
      message: 'Upload at most 200 rows at a time.',
    });
    expect(orders.createShipment).not.toHaveBeenCalled();
  });
});
