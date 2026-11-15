import { describe, expect, it } from 'vitest';
import { summarizePickups } from './summary';
import type { Pickup } from './types';

const pickup = (id: string, pickupDate: string, status: Pickup['status']): Pickup => ({
  id,
  pickupDate,
  window: null,
  carrier: 'delhivery',
  addressLabel: 'Hub',
  awbs: ['A'],
  status,
});

const TODAY = '2026-11-11';

describe('summarizePickups', () => {
  const pickups = [
    pickup('1', '2026-11-11', 'scheduled'),
    pickup('2', '2026-11-11', 'scheduled'),
    pickup('3', '2026-11-11', 'picked_up'),
    pickup('4', '2026-11-11', 'cancelled'),
    pickup('5', '2026-11-12', 'scheduled'),
    pickup('6', '2026-11-05', 'picked_up'),
    pickup('7', '2026-11-04', 'picked_up'),
    pickup('8', '2026-11-08', 'picked_up'),
  ];

  it('counts today by status and passes the ready count through', () => {
    const s = summarizePickups(pickups, 9, TODAY);
    expect(s.scheduledToday).toBe(2);
    expect(s.pickedUpToday).toBe(1);
    expect(s.pending).toBe(9);
  });

  it('charts the last 7 days including today, oldest first, without cancelled', () => {
    const { days } = summarizePickups(pickups, 0, TODAY);
    expect(days.map((d) => d.label)).toEqual(['5 Nov', '6 Nov', '7 Nov', '8 Nov', '9 Nov', '10 Nov', '11 Nov']);
    expect(days.map((d) => d.value)).toEqual([1, 0, 0, 1, 0, 0, 3]);
  });

  it('uses the Indian day of a Date for today', () => {
    // 20:00 UTC on 10 Nov is 01:30 on 11 Nov in India.
    const s = summarizePickups(pickups, 0, new Date('2026-11-10T20:00:00Z'));
    expect(s.scheduledToday).toBe(2);
    expect(s.days.at(-1)?.label).toBe('11 Nov');
  });

  it('leaves cancelled pickups out of the tiles and the chart', () => {
    const s = summarizePickups([pickup('c', '2026-11-11', 'cancelled')], 0, TODAY);
    expect(s.scheduledToday).toBe(0);
    expect(s.pickedUpToday).toBe(0);
    expect(s.days.at(-1)?.value).toBe(0);
  });

  it('reads a timestamp pickup date as an Indian day', () => {
    // 18:45 UTC on 10 Nov is 00:15 on 11 Nov in India, so it counts as 11 Nov.
    const s = summarizePickups([pickup('t', '2026-11-10T18:45:00Z', 'scheduled')], 0, TODAY);
    expect(s.scheduledToday).toBe(1);
    expect(s.days.at(-1)?.value).toBe(1);
    expect(s.days.at(-2)?.value).toBe(0);
  });
});
