import 'server-only';

import type { CarrierName } from '@logicore/contracts';
import { z } from 'zod';
import { chargeableWeightKg } from '@/lib/volumetric';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { RateCardRow, RatesService, Zone } from './types';

// The backend's zones, in the order the rate card shows them (A to D).
const ZONE: Record<string, Zone> = {
  'within-city': 'A',
  'within-state': 'B',
  'metro-metro': 'C',
  'rest-of-india': 'D',
};

const cardSchema = z.object({
  items: z.array(
    z.object({
      carrier: z.string(),
      zone: z.string(),
      base_weight_kg: z.number(),
      base_paise: z.number(),
      additional_per_500g_paise: z.number(),
      cod_fee_percent: z.number(),
      min_cod_fee_paise: z.number(),
    }),
  ),
});

const quoteSchema = z.object({
  items: z.array(
    z.object({
      carrier: z.string(),
      serviceable: z.boolean(),
      cod_available: z.boolean(),
      estimated_days: z.number().nullable(),
      chargeable_weight_kg: z.number(),
      total_paise: z.number().nullable(),
      reason: z.string().nullable().optional(),
    }),
  ),
});

/** Rate cards and quotes from /api/v1/rates: the same rates and limits booking uses. */
export const gatewayRatesService: RatesService = {
  async getRateCard() {
    const result = await gatewayFetch('/api/v1/rates/card', {
      schema: cardSchema,
      token: await merchantCredential('shipments'),
    });
    if (!result.ok) return fromGateway(result);
    const rows: RateCardRow[] = result.data.items.flatMap((r) => {
      const zone = ZONE[r.zone];
      return zone
        ? [
            {
              carrier: r.carrier as CarrierName,
              zone,
              baseWeightKg: r.base_weight_kg,
              basePaise: r.base_paise,
              additionalPer500gPaise: r.additional_per_500g_paise,
              codFeePercent: r.cod_fee_percent,
              minCodFeePaise: r.min_cod_fee_paise,
            },
          ]
        : [];
    });
    return fromGateway({ ...result, data: rows });
  },

  /** Priced on the chargeable weight: the higher of actual and volumetric, as couriers bill. */
  async quote(input) {
    const result = await gatewayFetch('/api/v1/rates/quote', {
      method: 'POST',
      schema: quoteSchema,
      token: await merchantCredential('shipments'),
      body: {
        origin_pincode: input.originPincode,
        destination_pincode: input.destinationPincode,
        weight_kg: chargeableWeightKg(input.weightKg, input.dimensions),
        payment_type: input.paymentType,
        ...(input.paymentType === 'COD' ? { cod_amount_paise: input.codAmountPaise ?? 0 } : {}),
      },
    });
    if (!result.ok) return fromGateway(result);
    return fromGateway({
      ...result,
      data: result.data.items.map((q) => ({
        carrier: q.carrier as CarrierName,
        serviceable: q.serviceable,
        codAvailable: q.cod_available,
        estimatedDays: q.estimated_days,
        chargePaise: q.total_paise,
        chargeableWeightKg: q.chargeable_weight_kg,
        reason: q.reason ?? null,
      })),
    });
  },
};
