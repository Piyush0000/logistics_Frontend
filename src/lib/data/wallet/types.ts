import type { DataResult } from '../source';
import type { DebitType, WalletFilters } from './filters';

export interface WalletBalance {
  availablePaise: number;
}

export interface WalletTransaction {
  id: string;
  direction: 'credit' | 'debit';
  /** Null for credits. */
  debitType: DebitType | null;
  title: string;
  orderRef: string | null;
  /** Always positive; direction gives the sign. */
  amountPaise: number;
  breakdown: { freightPaise: number; otherPaise: number; codPaise: number } | null;
  occurredAt: string;
}

export interface WalletTransactionPage {
  entries: WalletTransaction[];
  page: number;
  pageCount: number;
  total: number;
}

/** A recharge after the merchant comes back from the payment page. */
export interface RechargeStatus {
  id: string;
  status: 'CREATED' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  amountPaise: number;
  /** What was added to the wallet; null until paid. */
  creditedPaise: number | null;
}

export interface WalletService {
  getBalance(): Promise<DataResult<WalletBalance>>;
  listTransactions(filters: WalletFilters): Promise<DataResult<WalletTransactionPage>>;
  /** A null paymentUrl means no payment page exists, so nothing was charged. */
  startRecharge(amountPaise: number): Promise<DataResult<{ paymentUrl: string | null }>>;
  /** Asks whether a recharge was paid; the wallet is credited once if it was. */
  confirmRecharge(id: string): Promise<DataResult<RechargeStatus>>;
}
