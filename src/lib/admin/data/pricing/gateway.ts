import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, gatewayError, mapResult } from '../admin-fetch';
import { ZONE_MEANING, ZONES, type Zone } from './pricing-rules';
import type { AdminPricingService, PriceOverride, RateCardRow } from './types';

const NAMES: Record<string, string> = {
  delhivery: 'Delhivery',
  ekart: 'Ekart',
  bluedart: 'Blue Dart',
  shadowfax: 'Shadowfax',
  dhl: 'DHL',
};
const zoneOf = (backend: string) => ZONES.find((z) => ZONE_MEANING[z].backend === backend);
const backendZone = (zone: Zone) => ZONE_MEANING[zone].backend;

const rateSchema = z.object({
  carrier: z.string(),
  zone: z.string(),
  base_paise: z.number(),
  additional_paise: z.number(),
  cod_fee_pct: z.number(),
  min_cod_fee_paise: z.number(),
});
const courierSchema = z.object({
  carrier: z.string(),
  enabled: z.boolean(),
  running: z.boolean().optional(),
  delivery_rate: z.number().nullable(),
});
const overrideSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string().optional(),
  carrier: z.string(),
  discount_pct: z.number(),
  reason: z.string(),
  created_at: z.string(),
});

function toRow(r: z.infer<typeof rateSchema>): RateCardRow | null {
  const zone = zoneOf(r.zone);
  return zone
    ? {
        carrier: r.carrier,
        zone,
        basePaise: r.base_paise,
        extraPer500gPaise: r.additional_paise,
        codPercent: r.cod_fee_pct,
        codMinimumPaise: r.min_cod_fee_paise,
      }
    : null;
}
const toCourier = (c: z.infer<typeof courierSchema>) => ({
  carrier: c.carrier,
  name: NAMES[c.carrier] ?? c.carrier,
  enabled: c.enabled,
  running: c.running ?? true,
  deliveryRate: c.delivery_rate ?? 0,
});
const toOverride = (o: z.infer<typeof overrideSchema>): PriceOverride => ({
  id: o.id,
  merchantId: o.merchant_id,
  merchantName: o.merchant_name ?? o.merchant_id,
  carrier: o.carrier,
  discountPercent: o.discount_pct,
  reason: o.reason,
  createdAt: o.created_at,
});

/** Rate cards, courier switches and merchant discounts through /api/v1/admin/pricing. */
export const gatewayAdminPricingService: AdminPricingService = {
  async listRateCard() {
    const result = await gatewayFetch('/api/v1/admin/pricing/rates', {
      schema: z.object({ items: z.array(rateSchema) }),
      token: adminToken(),
    });
    return mapResult(result, ({ items }) => items.map(toRow).filter((r): r is RateCardRow => r !== null));
  },

  async listCouriers() {
    const result = await gatewayFetch('/api/v1/admin/pricing/couriers', {
      schema: z.object({ items: z.array(courierSchema) }),
      token: adminToken(),
    });
    return mapResult(result, ({ items }) => items.map(toCourier));
  },

  async setCourierEnabled(carrier, enabled) {
    const result = await gatewayFetch(`/api/v1/admin/pricing/couriers/${encodeURIComponent(carrier)}`, {
      method: 'POST',
      schema: courierSchema,
      token: adminToken(),
      body: { enabled },
    });
    return mapResult(result, toCourier);
  },

  async updateRate(change) {
    const result = await gatewayFetch('/api/v1/admin/pricing/rates', {
      method: 'POST',
      schema: z.object({ before: rateSchema, after: rateSchema }),
      token: adminToken(),
      body: {
        carrier: change.carrier,
        zone: backendZone(change.zone),
        base_paise: change.basePaise,
        additional_paise: change.extraPer500gPaise,
        cod_fee_pct: change.codPercent,
        min_cod_fee_paise: change.codMinimumPaise,
      },
    });
    if (!result.ok) return gatewayError(result.error);
    const before = toRow(result.data.before);
    const after = toRow(result.data.after);
    return before && after
      ? { ok: true, source: 'gateway', data: { before, after } }
      : gatewayError({ kind: 'validation', status: 400, message: 'That zone has no rate.' });
  },

  async listOverrides() {
    const result = await gatewayFetch('/api/v1/admin/pricing/overrides', {
      schema: z.object({ items: z.array(overrideSchema) }),
      token: adminToken(),
    });
    return mapResult(result, ({ items }) => items.map(toOverride));
  },

  /** "all" saves one discount per courier running here. */
  async addOverride(input) {
    let carriers = [input.carrier];
    if (input.carrier === 'all') {
      const couriers = await this.listCouriers();
      if (!couriers.ok) return couriers;
      carriers = couriers.data.map((c) => c.carrier);
    }
    let first: PriceOverride | null = null;
    for (const carrier of carriers) {
      const result = await gatewayFetch('/api/v1/admin/pricing/overrides', {
        method: 'POST',
        schema: overrideSchema,
        token: adminToken(),
        body: { merchant_id: input.merchantId, carrier, discount_pct: input.discountPercent, reason: input.reason },
      });
      if (!result.ok) return gatewayError(result.error);
      first ??= toOverride(result.data);
    }
    return first
      ? { ok: true, source: 'gateway', data: first }
      : gatewayError({ kind: 'validation', status: 400, message: 'No courier is running.' });
  },

  async removeOverride(id) {
    const result = await gatewayFetch(`/api/v1/admin/pricing/overrides/${encodeURIComponent(id)}/remove`, {
      method: 'POST',
      schema: overrideSchema,
      token: adminToken(),
    });
    return mapResult(result, toOverride);
  },
};
