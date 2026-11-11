import type { KycStatus } from '../../kyc';
import type { DataResult } from '../source';

export interface SubMerchant {
  id: string;
  name: string;
  email: string;
  gstin: string | null;
  kycStatus: KycStatus;
  /** Only the last 4 digits of the bank account are ever kept for display. */
  bankLast4: string;
  createdAt: string;
}

export interface SubMerchantInput {
  name: string;
  email: string;
  gstin: string | null;
  bank: { holder: string; account: string; ifsc: string };
}

export interface SubMerchantQuery {
  page: number;
  search: string;
}

export interface SubMerchantPage {
  items: SubMerchant[];
  page: number;
  pageCount: number;
  total: number;
}

export interface SubMerchantService {
  list(query: SubMerchantQuery): Promise<DataResult<SubMerchantPage>>;
  onboard(input: SubMerchantInput): Promise<DataResult<SubMerchant>>;
}

export const SUB_MERCHANT_PAGE_SIZE = 10;
