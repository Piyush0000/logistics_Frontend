import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const pickups = vi.hoisted(() => ({ schedulePickup: vi.fn() }));
const addresses = vi.hoisted(() => ({ list: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/pickups', () => ({ pickupsService: () => pickups }));
vi.mock('@/lib/data/pickup-addresses', () => ({ pickupAddressService: () => addresses }));
vi.mock('next/cache', () => cache);

import { schedulePickupAction } from './actions';

function inDays(count: number): string {
  const day = new Date(Date.now() + count * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(day);
}

const input = () => ({
  pickupDate: inDays(1),
  window: { start: '10:00', end: '14:00' },
  awbs: ['AWB1'],
  pickupAddressId: 'pa-001',
});

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  pickups.schedulePickup.mockReset();
  addresses.list.mockReset();
  cache.revalidatePath.mockReset();
  addresses.list.mockResolvedValue({ ok: true, source: 'mock', data: [{ id: 'pa-001' }] });
});

describe('schedulePickupAction', () => {
  it('refuses a signed-out caller', async () => {
    session.current = null;

    expect(await schedulePickupAction(input())).toEqual({ ok: false, message: 'Sign in again.' });
    expect(addresses.list).not.toHaveBeenCalled();
    expect(pickups.schedulePickup).not.toHaveBeenCalled();
  });

  it('checks the input before calling the service', async () => {
    const result = await schedulePickupAction({ ...input(), pickupDate: inDays(8) });

    expect(result).toEqual({ ok: false, message: 'Pickup date must be from today to 7 days ahead.' });
    expect(pickups.schedulePickup).not.toHaveBeenCalled();
  });

  it('refuses a pickup address that is not saved', async () => {
    const result = await schedulePickupAction({ ...input(), pickupAddressId: 'other' });

    expect(result).toMatchObject({ ok: false });
    expect(pickups.schedulePickup).not.toHaveBeenCalled();
  });

  it('says so when saved addresses are unavailable', async () => {
    addresses.list.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });

    expect(await schedulePickupAction(input())).toMatchObject({
      ok: false,
      message: 'Saved pickup addresses are not available yet. Try again later.',
    });
  });

  it('returns the id of the scheduled pickup and refreshes the list', async () => {
    pickups.schedulePickup.mockResolvedValue({ ok: true, source: 'mock', data: { id: 'pk-020' } });

    expect(await schedulePickupAction(input())).toEqual({ ok: true, pickupId: 'pk-020' });
    expect(cache.revalidatePath).toHaveBeenCalledWith('/orders/pickups');
  });

  it('passes on a service error', async () => {
    pickups.schedulePickup.mockResolvedValue({
      ok: false,
      source: 'mock',
      error: { kind: 'validation', status: 400, message: 'Select shipments from one courier per pickup.' },
    });

    expect(await schedulePickupAction(input())).toEqual({
      ok: false,
      message: 'Select shipments from one courier per pickup.',
    });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});
