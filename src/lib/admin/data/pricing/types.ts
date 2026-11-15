import type { DataResult } from '../../../data/source';

export const ZONES = ['A', 'B', 'C', 'D', 'E'] as const;
export type Zone = (typeof ZONES)[number];

/** The platform price for one courier and zone. Money is in paise. */
export interface RateCardRow {
  carrier: string;
  zone: Zone;
  /** Price of the first 500 g. */
  basePaise: number;
  /** Each extra 500 g. */
  extraPer500gPaise: number;
  codPercent: number;
  codMinimumPaise: number;
}

export interface CourierSetting {
  carrier: string;
  name: string;
  enabled: boolean;
  /** Share of shipments delivered over the last 30 days, 0 to 100. */
  deliveryRate: number;
}

export interface AdminPricingService {
  listRateCard(): Promise<DataResult<RateCardRow[]>>;
  listCouriers(): Promise<DataResult<CourierSetting[]>>;
  // Planned (Teammate 2): updateRate(row), setCourierEnabled(carrier, enabled), per-merchant overrides.
}
