import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const b2b = vi.hoisted(() => ({ createShipment: vi.fn() }));
const pickups = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/b2b', () => ({ b2bService: () => b2b }));
vi.mock('@/lib/data/pickup-addresses', () => ({ pickupAddressService: () => pickups }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createB2bShipmentAction } from './actions';

const input = {
  consignee: {
    name: 'Acme Traders',
    phone: '9822000000',
    line1: '1 Test Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'IN',
    pincode: '411001',
  },
  pickupAddressId: 'pa-001',
  boxes: [{ lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 2.5, count: 4 }],
  invoiceNumber: 'INV-1',
  invoiceValuePaise: 250000,
};

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  b2b.createShipment.mockReset();
  pickups.list.mockReset();
  pickups.list.mockResolvedValue({ ok: true, source: 'mock', data: [{ id: 'pa-001' }] });
});

describe('createB2bShipmentAction', () => {
  it('refuses a signed-out create', async () => {
    session.current = null;

    const result = await createB2bShipmentAction(input);

    expect(result).toEqual({ ok: false, message: 'Sign in again.' });
    expect(b2b.createShipment).not.toHaveBeenCalled();
    expect(pickups.list).not.toHaveBeenCalled();
  });

  it('checks the input before calling the service', async () => {
    const result = await createB2bShipmentAction({ ...input, boxes: [] });

    expect(result).toMatchObject({ ok: false, fieldErrors: { boxes: 'Add at least one box.' } });
    expect(b2b.createShipment).not.toHaveBeenCalled();
  });

  it('refuses a pickup address that is not saved', async () => {
    const result = await createB2bShipmentAction({ ...input, pickupAddressId: 'other' });

    expect(result).toMatchObject({ ok: false, fieldErrors: { pickupAddressId: expect.any(String) } });
    expect(b2b.createShipment).not.toHaveBeenCalled();
  });

  it('returns the LR number of the created shipment', async () => {
    b2b.createShipment.mockResolvedValue({ ok: true, source: 'mock', data: { lrNumber: 'LR1' } });

    expect(await createB2bShipmentAction(input)).toEqual({ ok: true, lrNumber: 'LR1' });
  });

  it('passes on a service error', async () => {
    b2b.createShipment.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });

    const result = await createB2bShipmentAction(input);

    expect(result).toMatchObject({ ok: false });
  });
});
