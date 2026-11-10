import type { CarrierName } from '@logicore/contracts';
import type { DataResult } from '../source';

export const ZONES = ['A', 'B', 'C', 'D', 'E'] as const;
export type Zone = (typeof ZONES)[number];

/** What each zone means, in the order A to E. */
export const ZONE_LABELS: Record<Zone, { name: string; description: string }> = {
  A: { name: 'Within city', description: 'Pickup and delivery pincodes start with the same three digits, so both are in the same city or district area.' },
  B: { name: 'Within state', description: 'Pickup and delivery are in the same state, but not in the same city or district area.' },
  C: { name: 'Metro to metro', description: 'Pickup and delivery are in different states, and both pincodes are in a major metro area.' },
  D: { name: 'Rest of India', description: 'Any other route within India.' },
  E: { name: 'Special', description: "A sample zone for remote areas. The courier network doesn't define it yet." },
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

export interface RatesService {
  getRateCard(): Promise<DataResult<RateCardRow[]>>;
}
