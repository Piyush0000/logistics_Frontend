import { beforeEach, describe, expect, it, vi } from 'vitest';

const orders = vi.hoisted(() => ({ listOrders: vi.fn() }));
vi.mock('../orders', () => ({ ordersService: () => orders }));

import { isValidIsoDay } from '../../format/calendar';
import { gatewayPickupsService } from './gateway';
import { pickupsService } from './index';
import { checkPickupDate, checkWindow, hasMixedCarriers, parsePickupInput } from './input';
import { mockPickupsService as mock } from './mock';
import { ONE_COURIER_MESSAGE } from './types';

// 10 Nov 2026, 10:00 in India.
const NOW = new Date('2026-11-10T04:30:00.000Z');

describe('checkPickupDate', () => {
  it('allows today and up to 7 days ahead, and refuses the rest', () => {
    expect(checkPickupDate('2026-11-10', NOW)).toBeNull();
    expect(checkPickupDate('2026-11-17', NOW)).toBeNull();
    expect(checkPickupDate('2026-11-18', NOW)).toMatch(/today to 7 days ahead/);
    expect(checkPickupDate('2026-11-09', NOW)).toMatch(/today to 7 days ahead/);
  });

  it('counts the day in Indian time, not UTC', () => {
    // 11 Nov 01:30 in India is still 10 Nov in UTC.
    const lateEvening = new Date('2026-11-10T20:00:00.000Z');
    expect(checkPickupDate('2026-11-10', lateEvening)).not.toBeNull();
    expect(checkPickupDate('2026-11-11', lateEvening)).toBeNull();
    expect(checkPickupDate('2026-11-18', lateEvening)).toBeNull();
    expect(checkPickupDate('2026-11-19', lateEvening)).not.toBeNull();
  });

  it('refuses text that is not a real date', () => {
    for (const date of ['', 'tomorrow', '2026-02-31', '2026-13-01', '10/11/2026']) {
      expect(checkPickupDate(date, NOW)).toBe('Choose a pickup date.');
    }
  });
});

describe('checkWindow', () => {
  it('accepts no window or an end after the start', () => {
    expect(checkWindow(null)).toBeNull();
    expect(checkWindow({ start: '10:00', end: '14:00' })).toBeNull();
    expect(checkWindow({ start: '00:00', end: '23:59' })).toBeNull();
  });

  it('refuses an end that is not after the start', () => {
    expect(checkWindow({ start: '14:00', end: '14:00' })).toBe('The window must end after it starts.');
    expect(checkWindow({ start: '14:00', end: '10:00' })).toBe('The window must end after it starts.');
  });

  it('refuses times that are not HH:mm', () => {
    expect(checkWindow({ start: '9:00', end: '14:00' })).toBe('Enter times like 10:00.');
    expect(checkWindow({ start: '10:00', end: '24:00' })).toBe('Enter times like 10:00.');
    expect(checkWindow({ start: '', end: '' })).toBe('Enter times like 10:00.');
  });
});

describe('hasMixedCarriers', () => {
  it('is true only when carriers differ', () => {
    expect(hasMixedCarriers(['ekart', 'ekart'])).toBe(false);
    expect(hasMixedCarriers([])).toBe(false);
    expect(hasMixedCarriers(['ekart', 'bluedart'])).toBe(true);
  });
});

describe('parsePickupInput', () => {
  const good = {
    pickupDate: '2026-11-12',
    window: { start: '10:00', end: '14:00' },
    awbs: ['A1', 'A1', 'A2'],
    pickupAddressId: 'pa-001',
  };

  it('keeps good input and drops repeated AWBs', () => {
    expect(parsePickupInput(good, NOW)).toEqual({
      ok: true,
      data: { ...good, awbs: ['A1', 'A2'] },
    });
    expect(parsePickupInput({ ...good, window: null }, NOW)).toMatchObject({ ok: true });
  });

  it('refuses each bad part with a plain message', () => {
    expect(parsePickupInput({ ...good, pickupDate: '2026-11-18' }, NOW)).toMatchObject({ ok: false });
    expect(parsePickupInput({ ...good, window: { start: '14:00', end: '10:00' } }, NOW)).toMatchObject({
      ok: false,
      message: 'The window must end after it starts.',
    });
    expect(parsePickupInput({ ...good, awbs: [] }, NOW)).toMatchObject({
      ok: false,
      message: 'Select at least one shipment.',
    });
    const tooMany = Array.from({ length: 101 }, (_, index) => `A${index}`);
    expect(parsePickupInput({ ...good, awbs: tooMany }, NOW)).toMatchObject({ ok: false });
    expect(parsePickupInput({ ...good, pickupAddressId: '' }, NOW)).toMatchObject({ ok: false });
    expect(parsePickupInput(null, NOW)).toMatchObject({ ok: false });
    expect(parsePickupInput({ ...good, window: 'soon' }, NOW)).toMatchObject({ ok: false });
  });
});

function tomorrow(): string {
  const day = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(day);
}

describe('mock pickups', () => {
  it('lists manifested shipments as ready to ship', async () => {
    const result = await mock.readyToShip();
    expect(result.ok && result.source).toBe('mock');
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    for (const order of result.data) expect(order.status).toBe('MANIFESTED');
    expect(new Set(result.data.map((order) => order.carrier)).size).toBeGreaterThanOrEqual(2);
  });

  it('lists sample pickups 10 to a page, newest first', async () => {
    const first = await mock.listPickups({ page: 1 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.items).toHaveLength(10);
    expect(first.data.pageCount).toBeGreaterThanOrEqual(2);
    const last = await mock.listPickups({ page: first.data.pageCount });
    expect(last.ok && last.data.items.length).toBeGreaterThan(0);
    // A page past the end is cut back to the last one.
    const beyond = await mock.listPickups({ page: 999 });
    expect(beyond.ok && beyond.data.page).toBe(first.data.pageCount);
  });

  it('has real dates and no repeated ids across every sample pickup', async () => {
    const first = await mock.listPickups({ page: 1 });
    if (!first.ok) throw new Error('list failed');
    const ids = new Set<string>();
    for (let page = 1; page <= first.data.pageCount; page += 1) {
      const result = await mock.listPickups({ page });
      if (!result.ok) throw new Error('list failed');
      for (const pickup of result.data.items) {
        expect(isValidIsoDay(pickup.pickupDate), pickup.pickupDate).toBe(true);
        expect(ids.has(pickup.id)).toBe(false);
        ids.add(pickup.id);
      }
    }
  });

  it('refuses shipments from two couriers', async () => {
    const ready = await mock.readyToShip();
    if (!ready.ok) throw new Error('not ready');
    const a = ready.data[0]!;
    const b = ready.data.find((order) => order.carrier !== a.carrier)!;
    const result = await mock.schedulePickup({
      pickupDate: tomorrow(),
      window: null,
      awbs: [a.awb, b.awb],
      pickupAddressId: 'pa-001',
    });
    expect(result).toMatchObject({ ok: false, error: { kind: 'validation', message: ONE_COURIER_MESSAGE } });
  });

  it('refuses an AWB that is not ready to ship, and an unknown address', async () => {
    const ready = await mock.readyToShip();
    if (!ready.ok) throw new Error('not ready');
    const base = { pickupDate: tomorrow(), window: null, pickupAddressId: 'pa-001' };
    expect(await mock.schedulePickup({ ...base, awbs: ['DEMOEK001'] })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    expect(
      await mock.schedulePickup({ ...base, awbs: [ready.data[0]!.awb], pickupAddressId: 'nope' }),
    ).toMatchObject({ ok: false, error: { kind: 'validation' } });
  });

  it('refuses a date outside the allowed days', async () => {
    const ready = await mock.readyToShip();
    if (!ready.ok) throw new Error('not ready');
    const result = await mock.schedulePickup({
      pickupDate: '2020-01-01',
      window: null,
      awbs: [ready.data[0]!.awb],
      pickupAddressId: 'pa-001',
    });
    expect(result).toMatchObject({ ok: false, error: { kind: 'validation' } });
  });

  it('schedules a pickup, labels its address, and lists it first', async () => {
    const ready = await mock.readyToShip();
    if (!ready.ok) throw new Error('not ready');
    const order = ready.data[0]!;
    const result = await mock.schedulePickup({
      pickupDate: tomorrow(),
      window: { start: '11:15', end: '13:45' },
      awbs: [order.awb],
      pickupAddressId: 'pa-001',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      status: 'scheduled',
      carrier: order.carrier,
      addressLabel: 'Bengaluru warehouse',
      awbs: [order.awb],
    });
    const list = await mock.listPickups({ page: 1 });
    expect(list.ok && list.data.items[0]).toEqual(result.data);
    const one = await mock.getPickup(result.data.id);
    expect(one.ok && one.data).toEqual(result.data);
  });

  it('answers not found for an unknown pickup', async () => {
    expect(await mock.getPickup('nope')).toMatchObject({ ok: false, error: { kind: 'not_found' } });
  });

  it('has a sample pickup with a 20-character AWB', async () => {
    const one = await mock.getPickup('pk-001');
    expect(one.ok && one.data.awbs.some((awb) => awb.length === 20)).toBe(true);
  });
});

describe('gateway pickups', () => {
  beforeEach(() => orders.listOrders.mockReset());

  it('has no route for pickups, so they are unavailable', async () => {
    const unavailable = { ok: false, source: 'gateway', error: { kind: 'unavailable' } };
    expect(await gatewayPickupsService.listPickups({ page: 1 })).toMatchObject(unavailable);
    expect(
      await gatewayPickupsService.schedulePickup({
        pickupDate: '2026-11-11',
        window: null,
        awbs: ['A'],
        pickupAddressId: 'pa-001',
      }),
    ).toMatchObject(unavailable);
    expect(await gatewayPickupsService.getPickup('pk-001')).toMatchObject(unavailable);
  });

  it('reads manifested shipments through the orders service', async () => {
    const item = {
      shipment_id: 's1',
      reference_id: 'R',
      carrier: 'ekart',
      awb: 'LIVE201',
      status: 'MANIFESTED',
      created_at: 'x',
      last_status_at: 'x',
      stuck: false,
    };
    orders.listOrders.mockResolvedValue({
      ok: true,
      source: 'gateway',
      data: { items: [item], page: 1, limit: 100, total: 1 },
    });

    const result = await gatewayPickupsService.readyToShip();

    expect(orders.listOrders).toHaveBeenCalledWith({ status: 'MANIFESTED', limit: 100, page: 1 });
    expect(result).toEqual({ ok: true, source: 'gateway', data: [item] });
  });

  it('passes on an orders failure', async () => {
    const failure = {
      ok: false,
      source: 'gateway',
      error: { kind: 'network', status: 0, message: 'down' },
    };
    orders.listOrders.mockResolvedValue(failure);
    expect(await gatewayPickupsService.readyToShip()).toEqual(failure);
  });
});

describe('pickupsService resolution', () => {
  it('uses mock until DATA_SOURCE_PICKUPS is gateway', () => {
    delete process.env.DATA_SOURCE_PICKUPS;
    expect(pickupsService()).toBe(mock);
    process.env.DATA_SOURCE_PICKUPS = 'gateway';
    expect(pickupsService()).toBe(gatewayPickupsService);
    delete process.env.DATA_SOURCE_PICKUPS;
  });
});
