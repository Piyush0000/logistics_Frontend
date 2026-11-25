import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { ordersService } from '../orders';
import { fromGateway } from '../source';
import { PICKUPS_PAGE_SIZE, type Pickup, type PickupService } from './types';

const pickupSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  pickup_date: z.string(),
  window: z.object({ start: z.string(), end: z.string() }).nullable(),
  address_label: z.string(),
  awbs: z.array(z.string()),
  status: z.enum(['REQUESTED', 'SCHEDULED', 'FAILED', 'CANCELLED', 'PICKED_UP']),
  carrier_pickup_id: z.string().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
});

/** A pickup waiting for the courier's answer still counts as scheduled; a refused one is cancelled. */
function toPickup(p: z.infer<typeof pickupSchema>): Pickup {
  return {
    id: p.id,
    pickupDate: p.pickup_date,
    window: p.window,
    carrier: p.carrier,
    addressLabel: p.error ? `${p.address_label} (courier refused: ${p.error})` : p.address_label,
    awbs: p.awbs,
    status: p.status === 'PICKED_UP' ? 'picked_up' : p.status === 'FAILED' || p.status === 'CANCELLED' ? 'cancelled' : 'scheduled',
  };
}

/** Pickups from /api/v1/pickups; shipments ready to ship are manifested ones not in an open pickup. */
export const gatewayPickupsService: PickupService = {
  async listPickups({ page }) {
    const result = await gatewayFetch('/api/v1/pickups', {
      schema: z.object({ items: z.array(pickupSchema), page: z.number(), limit: z.number(), total: z.number() }),
      token: await merchantCredential('shipments'),
      query: { page, limit: PICKUPS_PAGE_SIZE },
    });
    if (!result.ok) return fromGateway(result);
    const { items, total, limit } = result.data;
    return fromGateway({
      ...result,
      data: { items: items.map(toPickup), page: result.data.page, pageCount: Math.max(1, Math.ceil(total / limit)) },
    });
  },

  async getPickup(id) {
    const result = await gatewayFetch(`/api/v1/pickups/${encodeURIComponent(id)}`, {
      schema: pickupSchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: toPickup(result.data) } : result);
  },

  async schedulePickup(input) {
    const result = await gatewayFetch('/api/v1/pickups', {
      method: 'POST',
      schema: pickupSchema,
      token: await merchantCredential('shipments'),
      body: {
        pickup_date: input.pickupDate,
        ...(input.window ? { window: input.window } : {}),
        awbs: input.awbs,
        ...(input.pickupAddressId ? { pickup_address_id: input.pickupAddressId } : {}),
      },
    });
    return fromGateway(result.ok ? { ...result, data: toPickup(result.data) } : result);
  },

  async readyToShip() {
    const [orders, busy] = await Promise.all([
      ordersService().listOrders({ status: 'MANIFESTED', limit: 100, page: 1 }),
      gatewayFetch('/api/v1/pickups/busy-awbs', {
        schema: z.object({ awbs: z.array(z.string()) }),
        token: await merchantCredential('shipments'),
      }),
    ]);
    if (!orders.ok) return orders;
    if (!busy.ok) return fromGateway(busy);
    const taken = new Set(busy.data.awbs);
    return { ...orders, data: orders.data.items.filter((o) => !taken.has(o.awb)) };
  },
};
