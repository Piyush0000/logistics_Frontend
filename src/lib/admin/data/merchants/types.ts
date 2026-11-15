import type { Page } from '../common';
import type { DataResult } from '../../../data/source';

export const MERCHANT_STATUSES = ['active', 'pending', 'suspended'] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];
export type KycStatus = 'not_started' | 'submitted' | 'approved' | 'rejected';

/** One row of the merchants list. */
export interface MerchantSummary {
  id: string;
  name: string;
  email: string;
  city: string;
  status: MerchantStatus;
  kyc: KycStatus;
  /** YYYY-MM-DD. */
  joinedAt: string;
  shipments30d: number;
  walletPaise: number;
}

/** Everything the merchant detail page shows. Teammate 1 extends this as the page grows. */
export interface MerchantDetail extends MerchantSummary {
  phone: string;
  gstin: string | null;
  /** Shipments by status over the last 30 days. */
  shipmentsByStatus: { status: string; count: number }[];
  notes: string[];
}

export interface MerchantListQuery {
  q?: string;
  status?: MerchantStatus;
  page?: number;
}

export interface AdminMerchantsService {
  listMerchants(query: MerchantListQuery): Promise<DataResult<Page<MerchantSummary>>>;
  getMerchant(id: string): Promise<DataResult<MerchantDetail>>;
  // Planned (Teammate 1): setMerchantStatus(id, status, reason) to suspend or reactivate.
}
