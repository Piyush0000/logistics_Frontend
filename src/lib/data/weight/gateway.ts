import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch, type GatewayResult } from '../../gateway/client';
import { fromGateway } from '../source';
import {
  DISCREPANCY_STATUSES,
  WEIGHT_PAGE_SIZE,
  type WeightDiscrepancy,
  type WeightService,
} from './types';

const DiscrepancySchema = z.object({
  id: z.string(),
  awb: z.string(),
  carrier: z.string(),
  declared_grams: z.number().int(),
  charged_grams: z.number().int(),
  extra_charge_paise: z.number().int(),
  status: z.enum(DISCREPANCY_STATUSES),
  raised_at: z.string(),
  respond_by: z.string(),
});

const toDiscrepancy = (d: z.infer<typeof DiscrepancySchema>): WeightDiscrepancy => ({
  id: d.id,
  awb: d.awb,
  carrier: d.carrier,
  declaredKg: d.declared_grams / 1000,
  chargedKg: d.charged_grams / 1000,
  extraChargePaise: d.extra_charge_paise,
  status: d.status,
  raisedAt: d.raised_at,
  respondBy: d.respond_by,
});

const one = (result: GatewayResult<z.output<typeof DiscrepancySchema>>) =>
  fromGateway(result.ok ? { ...result, data: toDiscrepancy(result.data) } : result);

/** Courier weight disputes from /api/v1/weight. Accepting takes the extra charge from the wallet. */
export const gatewayWeightService: WeightService = {
  async getSummary() {
    const result = await gatewayFetch('/api/v1/weight/summary', {
      schema: z.object({ open: z.number(), disputed: z.number(), extra_charge_paise: z.number() }),
      token: await merchantCredential('shipments'),
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              open: result.data.open,
              disputed: result.data.disputed,
              extraChargePaise: result.data.extra_charge_paise,
            },
          }
        : result,
    );
  },

  async listDiscrepancies({ status, q, page }) {
    const result = await gatewayFetch('/api/v1/weight/discrepancies', {
      schema: z.object({
        items: z.array(DiscrepancySchema),
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
      }),
      token: await merchantCredential('shipments'),
      query: { status, q: q || undefined, page, limit: WEIGHT_PAGE_SIZE },
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              items: result.data.items.map(toDiscrepancy),
              page: result.data.page,
              pageCount: Math.max(1, Math.ceil(result.data.total / result.data.limit)),
            },
          }
        : result,
    );
  },

  async accept(id) {
    return one(
      await gatewayFetch(`/api/v1/weight/discrepancies/${encodeURIComponent(id)}/accept`, {
        method: 'POST',
        schema: DiscrepancySchema,
        token: await merchantCredential('shipments'),
      }),
    );
  },

  async dispute({ id, note, evidence }) {
    return one(
      await gatewayFetch(`/api/v1/weight/discrepancies/${encodeURIComponent(id)}/dispute`, {
        method: 'POST',
        schema: DiscrepancySchema,
        token: await merchantCredential('shipments'),
        body: { note, evidence: evidence.map(({ name, type, size }) => ({ name, type, size })) },
      }),
    );
  },
};
