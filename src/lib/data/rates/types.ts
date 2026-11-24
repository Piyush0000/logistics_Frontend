import type { CarrierName, PaymentType } from '@logicore/contracts';
import type { PackageDimensions } from '@/lib/volumetric';
import type { DataResult } from '../source';

export const ZONES = ['A', 'B', 'C', 'D', 'E'] as const;
export type Zone = (typeof ZONES)[number];

/** What each zone means, in the order A to E. */
export const ZONE_LABELS: Record<Zone, { name: string; description: string }> = {
  A: { name: 'Within city', description: 'Pickup and delivery pincodes start with the same three digits, so both are in the same city or district area.' },
  B: { name: 'Within state', description: 'Pickup and delivery are in the same state, but not in the same city or district area.' },
  C: { name: 'Metro to metro', description: 'Pickup and delivery are in different states, and both pincodes are in a major metro area.' },
  D: { name: 'Rest of India', description: 'Any other route within India.' },
  E: {
    name: 'Special',
    description:
      'Remote areas: either end in the North-east, Jammu and Kashmir or Ladakh, Andaman and Nicobar, or Lakshadweep.',
  },
};

/** One courier's price for one zone. Fields mirror the backend's RateCard, in paise and kilograms. */
export interface RateCardRow {
  carrier: CarrierName;
  zone: Zone;
  baseWeightKg: number;
  basePaise: number;
  additionalPer500gPaise: number;
  codFeePercent: number;
  minCodFeePaise: number;
}

/** What a merchant asks a quote for. Money is paise and sizes are centimetres. */
export interface QuoteInput {
  originPincode: string;
  destinationPincode: string;
  weightKg: number;
  dimensions: PackageDimensions;
  paymentType: PaymentType;
  /** The amount to collect, in paise. Only set for COD. */
  codAmountPaise?: number;
}

/** One courier's answer. Mirrors the backend's serviceability result, with the price in paise. */
export interface RateQuote {
  carrier: CarrierName;
  serviceable: boolean;
  codAvailable: boolean;
  estimatedDays: number | null;
  chargePaise: number | null;
  chargeableWeightKg: number;
  /** Why the courier can't take it: NO_RATE_CARD, WEIGHT_LIMIT, NOT_SERVICEABLE, COD_NOT_OFFERED and so on. */
  reason?: string | null;
}

export interface RatesService {
  getRateCard(): Promise<DataResult<RateCardRow[]>>;
  /** One quote for every courier, in no particular order. */
  quote(input: QuoteInput): Promise<DataResult<RateQuote[]>>;
}
