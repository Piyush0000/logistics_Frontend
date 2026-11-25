import { beforeEach, describe, expect, it, vi } from 'vitest';

const saved: { label: string; address: { line1: string; pincode: string }; isDefault: boolean }[] = [];
const booked: unknown[] = [];

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => ({ email: 'a@b.co', role: 'admin' }) }));
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('redirect');
  },
}));
vi.mock('@/lib/data/orders', () => ({
  ordersService: () => ({
    createShipment: async (input: unknown) => {
      booked.push(input);
      return { ok: true, source: 'gateway', data: { awb: 'EVS8516979039', shipment_id: 's1' } };
    },
  }),
}));
vi.mock('@/lib/data/pickup-addresses', () => ({
  pickupAddressService: () => ({
    list: async () => ({
      ok: true,
      source: 'gateway',
      data: saved.map((a, i) => ({ id: `p${i}`, ...a })),
    }),
    save: async (a: (typeof saved)[number]) => {
      saved.push(a);
      return { ok: true, source: 'gateway', data: { id: `p${saved.length}`, ...a } };
    },
  }),
}));

const { createShipmentAction } = await import('./actions');

function form(extra: Record<string, string> = {}) {
  const f = new FormData();
  const fields: Record<string, string> = {
    idempotency_key: `idem-${Math.random()}`,
    origin_name: 'Asha Mart',
    origin_phone: '9876543210',
    origin_line1: 'Plot 42, Electronic City',
    origin_city: 'Bengaluru',
    origin_state: 'Karnataka',
    origin_pincode: '560100',
    destination_name: 'Ravi',
    destination_phone: '9823456789',
    destination_line1: 'Flat 12, Linking Road',
    destination_city: 'Mumbai',
    destination_state: 'Maharashtra',
    destination_pincode: '400052',
    weight_kg: '0.5',
    length_cm: '10',
    width_cm: '10',
    height_cm: '5',
    item_name: 'Mug',
    item_quantity: '1',
    item_unit_price: '399',
    payment_type: 'PREPAID',
    ...extra,
  };
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  saved.length = 0;
  booked.length = 0;
});

describe('saving the pickup address while booking', () => {
  it('saves it once, as the default when it is the first, and not again for the same place', async () => {
    const first = await createShipmentAction(
      { ok: false },
      form({ save_pickup_address: 'on', pickup_address_label: 'Main warehouse' }),
    );
    expect(first).toMatchObject({ ok: true, addressSaved: true });
    expect(saved).toEqual([
      expect.objectContaining({ label: 'Main warehouse', isDefault: true, address: expect.objectContaining({ pincode: '560100' }) }),
    ]);

    const again = await createShipmentAction({ ok: false }, form({ save_pickup_address: 'on' }));
    expect(again).toMatchObject({ ok: true, addressSaved: true });
    expect(saved).toHaveLength(1);
  });

  it('saves nothing when not asked', async () => {
    expect(await createShipmentAction({ ok: false }, form())).toMatchObject({ ok: true, addressSaved: false });
    expect(saved).toHaveLength(0);
    expect(booked).toHaveLength(1);
  });
});
