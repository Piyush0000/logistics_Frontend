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

export interface WalletService {
  getBalance(): Promise<DataResult<WalletBalance>>;
  listTransactions(filters: WalletFilters): Promise<DataResult<WalletTransactionPage>>;
}
