import { describe, expect, it } from 'vitest';
import { gatewayB2bService } from './gateway';
import { b2bService } from './index';
import { parseB2bInput, totalWeightKg } from './input';
import { mockB2bService as mock } from './mock';

const consignee = {
  name: 'Acme Traders',
  phone: '9822000000',
  line1: '1 Test Road',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'IN',
  pincode: '411001',
};
const box = { lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 2.5, count: 4 };
const valid = {
  consignee,
  pickupAddressId: 'pa-001',
  boxes: [box],
  invoiceNumber: 'INV-1',
  invoiceValuePaise: 250000,
};

describe('totalWeightKg', () => {
  it('totals box weight by count', () => {
    const boxes = [box, { ...box, weightKg: 10, count: 1 }];
    expect(totalWeightKg(boxes)).toBe(20);
  });

  it('avoids floating point drift', () => {
    expect(totalWeightKg([{ ...box, weightKg: 0.1, count: 3 }])).toBe(0.3);
  });
});

describe('parseB2bInput', () => {
  it('accepts a valid shipment', () => {
    expect(parseB2bInput(valid).ok).toBe(true);
  });

  it('rejects an empty box list', () => {
    const result = parseB2bInput({ ...valid, boxes: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.boxes).toBe('Add at least one box.');
  });

  it('rejects more than 50 boxes and out-of-range box values', () => {
    expect(parseB2bInput({ ...valid, boxes: Array(51).fill(box) }).ok).toBe(false);
    for (const bad of [
      { lengthCm: 0 },
      { widthCm: 501 },
      { heightCm: 0.5 },
      { weightKg: 0.05 },
      { weightKg: 1000.5 },
      { count: 0 },
      { count: 1000 },
      { count: 1.5 },
    ]) {
      expect(parseB2bInput({ ...valid, boxes: [{ ...box, ...bad }] }).ok).toBe(false);
    }
  });

  it('rejects a bad invoice or consignee', () => {
    expect(parseB2bInput({ ...valid, invoiceNumber: '' }).ok).toBe(false);
    expect(parseB2bInput({ ...valid, invoiceNumber: 'x'.repeat(33) }).ok).toBe(false);
    expect(parseB2bInput({ ...valid, invoiceValuePaise: 99 }).ok).toBe(false);
    expect(parseB2bInput({ ...valid, invoiceValuePaise: 100.5 }).ok).toBe(false);
    expect(parseB2bInput({ ...valid, pickupAddressId: '' }).ok).toBe(false);
    const bad = parseB2bInput({ ...valid, consignee: { ...consignee, pincode: '012345' } });
    expect(bad.ok).toBe(false);
  });
});

describe('mock B2B shipments', () => {
  it('pages 20 at a time and keeps a long name and a large invoice among the samples', async () => {
    const first = await mock.listShipments({ page: 1, search: '' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.source).toBe('mock');
    expect(first.data.items).toHaveLength(20);
    expect(first.data.pageCount).toBe(2);
    const second = await mock.listShipments({ page: 2, search: '' });
    if (!second.ok) return;
    const everyRow = [...first.data.items, ...second.data.items];
    expect(everyRow.some((row) => row.consignee.length > 60)).toBe(true);
    expect(everyRow.some((row) => row.invoiceValuePaise >= 1_00_00_000 * 100)).toBe(true);
  });

  it('clamps a page past the end and searches LR number or consignee', async () => {
    const beyond = await mock.listShipments({ page: 99, search: '' });
    if (beyond.ok) expect(beyond.data.page).toBe(beyond.data.pageCount);
    const byName = await mock.listShipments({ page: 1, search: 'KUMAR' });
    if (!byName.ok) throw new Error('search failed');
    expect(byName.data.total).toBeGreaterThan(0);
    const byLr = await mock.listShipments({ page: 1, search: byName.data.items[0]!.lrNumber.toLowerCase() });
    if (byLr.ok) expect(byLr.data.items[0]?.lrNumber).toBe(byName.data.items[0]!.lrNumber);
    const none = await mock.listShipments({ page: 1, search: 'zzzz-no-match' });
    if (none.ok) expect(none.data.items).toEqual([]);
  });

  it('adds a created shipment to the sample list', async () => {
    const before = await mock.listShipments({ page: 1, search: '' });
    if (!before.ok) throw new Error('list failed');
    const created = await mock.createShipment(valid);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data).toMatchObject({
      consignee: 'Acme Traders',
      destinationCity: 'Pune',
      boxes: 4,
      totalWeightKg: 10,
      invoiceValuePaise: 250000,
      status: 'MANIFESTED',
    });
    const after = await mock.listShipments({ page: 1, search: '' });
    if (!after.ok) throw new Error('list failed');
    expect(after.data.total).toBe(before.data.total + 1);
    expect(after.data.items[0]?.id).toBe(created.data.id);
  });

  it('refuses invalid input without adding it', async () => {
    const before = await mock.listShipments({ page: 1, search: '' });
    const result = await mock.createShipment({ ...valid, boxes: [] });
    expect(result.ok).toBe(false);
    const after = await mock.listShipments({ page: 1, search: '' });
    if (before.ok && after.ok) expect(after.data.total).toBe(before.data.total);
  });
});

describe('gateway B2B shipments', () => {
  it('reports both methods as unavailable', async () => {
    const expected = {
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    };
    expect(await gatewayB2bService.listShipments({ page: 1, search: '' })).toEqual(expected);
    expect(await gatewayB2bService.createShipment(valid)).toEqual(expected);
  });

  it('picks the source from DATA_SOURCE_B2B', () => {
    expect(b2bService()).toBe(mock);
    process.env.DATA_SOURCE_B2B = 'gateway';
    try {
      expect(b2bService()).toBe(gatewayB2bService);
    } finally {
      delete process.env.DATA_SOURCE_B2B;
    }
  });
});
