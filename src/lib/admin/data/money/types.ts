import type { DataResult } from '../../../data/source';

/** One merchant's wallet. Money is in paise. */
export interface MerchantWallet {
  merchantId: string;
  merchantName: string;
  balancePaise: number;
  /** Reserved for shipments not yet charged. */
  holdPaise: number;
  /** ISO timestamp, or null when the merchant never recharged. */
  lastRechargeAt: string | null;
}

export type RemittanceStatus = 'expected' | 'received' | 'reconciled' | 'short';

/** A COD payout batch a courier owes or has paid. */
export interface CodRemittance {
  id: string;
  carrier: string;
  /** YYYY-MM-DD, the last delivery day the batch covers. */
  periodEnd: string;
  expectedPaise: number;
  receivedPaise: number;
  status: RemittanceStatus;
}

export interface AdminMoneyService {
  listWallets(): Promise<DataResult<MerchantWallet[]>>;
  /** Used by the merchant detail page (Teammate 1) for the wallet tile. Owned by Teammate 2. */
  getMerchantWallet(merchantId: string): Promise<DataResult<MerchantWallet>>;
  listRemittances(): Promise<DataResult<CodRemittance[]>>;
  // Planned (Teammate 2): adjustWallet({ merchantId, amountPaise, direction, reason }),
  // COD exceptions (list, resolve), reconcile and verify-bank actions.
}
