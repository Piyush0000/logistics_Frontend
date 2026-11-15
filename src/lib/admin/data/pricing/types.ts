import type { DataResult } from '../../../data/source';
import type { OverrideInput, RateChange, Zone } from './pricing-rules';

export { ZONES } from './pricing-rules';
export type { OverrideInput, RateChange, Zone } from './pricing-rules';

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

/** A merchant on a custom price: a percent off the platform rate card. */
export interface PriceOverride {
  id: string;
  merchantId: string;
  merchantName: string;
  /** A courier, or 'all'. */
  carrier: string;
  discountPercent: number;
  reason: string;
  createdAt: string;
}

export interface AdminPricingService {
  listRateCard(): Promise<DataResult<RateCardRow[]>>;
  listCouriers(): Promise<DataResult<CourierSetting[]>>;
  /** A conflict error when this would turn off the last courier that is on; not_found for an unknown courier. */
  setCourierEnabled(carrier: string, enabled: boolean): Promise<DataResult<CourierSetting>>;
  /** Replaces one row; a validation error for prices outside the limits. Returns the row before and after. */
  updateRate(change: RateChange): Promise<DataResult<{ before: RateCardRow; after: RateCardRow }>>;
  listOverrides(): Promise<DataResult<PriceOverride[]>>;
  /** not_found for an unknown merchant; conflict when that merchant already has one for that courier. */
  addOverride(input: OverrideInput): Promise<DataResult<PriceOverride>>;
  removeOverride(id: string): Promise<DataResult<PriceOverride>>;
  // None of these audit: each server action calls recordAudit() after it succeeds.
}
