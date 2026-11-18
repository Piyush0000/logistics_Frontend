import type { Page } from '../common';
import type { DataResult } from '../../../data/source';
import type { WalletAdjustment, WalletDirection } from './wallet-adjustment';

export type { WalletAdjustment, WalletDirection } from './wallet-adjustment';

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

export type WalletTransactionKind = 'recharge' | 'shipping' | 'adjustment';

/** One line of a merchant's wallet ledger. */
export interface WalletLedgerEntry {
  id: string;
  /** ISO timestamp. */
  at: string;
  kind: WalletTransactionKind;
  direction: WalletDirection;
  /** Always positive; `direction` gives the sign. */
  amountPaise: number;
  /** The wallet balance straight after this line. */
  balanceAfterPaise: number;
  description: string;
}

export interface WalletLedger {
  wallet: MerchantWallet;
  /** Newest first. */
  page: Page<WalletLedgerEntry>;
}

/** The figures at the top of the Money page. */
export interface MoneySummary {
  /** Money merchants hold with us: the sum of the wallets above zero. */
  walletFloatPaise: number;
  negativeWallets: number;
  /** Still owed by couriers: expected minus received, for batches not yet reconciled. */
  codOutstandingPaise: number;
  /** The gap on batches paid short. */
  shortPaymentsPaise: number;
  shortBatches: number;
}

/**
 * expected: the courier has not paid or sent its file yet. received: paid, not reconciled yet.
 * reconciled: matched line by line, nothing owed. short: reconciled, and paid less than expected.
 */
export type RemittanceStatus = 'expected' | 'received' | 'reconciled' | 'short';

/** What the bank actually credited, checked against the batch's lines total. */
export interface BankVerification {
  bankCreditPaise: number;
  /** Bank credit minus the lines total: below zero is short, above is surplus. */
  variancePaise: number;
  result: 'verified' | 'short' | 'surplus';
  utr: string | null;
  verifiedAt: string;
}

/** A COD payout batch a courier owes or has paid. */
export interface CodRemittance {
  id: string;
  carrier: string;
  /** YYYY-MM-DD, the last delivery day the batch covers. */
  periodEnd: string;
  /** YYYY-MM-DD, periodEnd plus the courier's payout days. */
  dueDate: string;
  expectedPaise: number;
  /** The total of the courier's file; 0 until it arrives. */
  receivedPaise: number;
  status: RemittanceStatus;
  utr: string | null;
  lineCount: number;
  /** ISO timestamp, or null when not reconciled yet. */
  reconciledAt: string | null;
  bankVerification: BankVerification | null;
}

/**
 * pending: not paid yet. unchecked: paid, batch not reconciled yet.
 * matched / mismatch: the result of reconciling.
 */
export type LineMatch = 'pending' | 'unchecked' | 'matched' | 'mismatch';

/** One COD order in a batch. */
export interface CodRemittanceLine {
  awb: string;
  merchantId: string;
  merchantName: string;
  expectedPaise: number;
  /** Null until the courier pays. */
  receivedPaise: number | null;
  match: LineMatch;
}

export type CodExceptionType = 'amount_mismatch' | 'unknown_awb' | 'duplicate_payment' | 'overdue_remittance';
export type CodExceptionStatus = 'open' | 'resolved' | 'written_off';

/** A COD line that needs a person: opened by reconciling, closed with a reason. */
export interface CodException {
  id: string;
  batchId: string;
  carrier: string;
  awb: string;
  merchantName: string;
  type: CodExceptionType;
  status: CodExceptionStatus;
  expectedPaise: number;
  receivedPaise: number;
  /** Received minus expected. */
  variancePaise: number;
  createdAt: string;
  resolution: { note: string; at: string } | null;
}

export interface CodRemittanceDetail {
  remittance: CodRemittance;
  lines: Page<CodRemittanceLine>;
  exceptions: CodException[];
}

/** A batch the courier has not paid by its due date. */
export interface OverdueRemittance {
  batchId: string;
  carrier: string;
  periodEnd: string;
  dueDate: string;
  daysOverdue: number;
  expectedPaise: number;
}

export interface ReconcileResult {
  remittance: CodRemittance;
  matched: number;
  mismatched: number;
}

export interface AdminMoneyService {
  getSummary(): Promise<DataResult<MoneySummary>>;
  listWallets(): Promise<DataResult<MerchantWallet[]>>;
  /** Used by the merchant detail page (Teammate 1) for the wallet tile. Owned by Teammate 2. Includes adjustments. */
  getMerchantWallet(merchantId: string): Promise<DataResult<MerchantWallet>>;
  /** A not_found error for an unknown merchant. */
  getWalletLedger(merchantId: string, page: number): Promise<DataResult<WalletLedger>>;
  /**
   * Credits or debits a wallet and adds a ledger line. Returns the updated wallet; a not_found error
   * for an unknown merchant and a validation error for an amount outside the limits. Does not audit:
   * the server action calls recordAudit() after it succeeds.
   */
  adjustWallet(adjustment: WalletAdjustment): Promise<DataResult<MerchantWallet>>;
  listRemittances(): Promise<DataResult<CodRemittance[]>>;
  /** A not_found error for an unknown batch. */
  getRemittance(id: string, page: number): Promise<DataResult<CodRemittanceDetail>>;
  /**
   * Mirrors POST /v1/reconciliation/remittances/:id/reconcile: matches every line and opens an
   * exception for each mismatch. A conflict error when the batch is already reconciled or not paid yet.
   */
  reconcileRemittance(id: string): Promise<DataResult<ReconcileResult>>;
  /** Mirrors POST /v1/reconciliation/remittances/:id/verify-bank. A conflict error before the courier pays. */
  verifyBankTransfer(id: string, bankCreditPaise: number, utr: string | null): Promise<DataResult<BankVerification>>;
  /** Mirrors GET /v1/reconciliation/exceptions: open ones first, then newest first. */
  listCodExceptions(): Promise<DataResult<CodException[]>>;
  /** Mirrors POST /v1/reconciliation/exceptions/:id/resolve. A conflict error when already closed. */
  resolveCodException(
    id: string,
    resolution: 'resolved' | 'written_off',
    note: string,
  ): Promise<DataResult<CodException>>;
  /** Mirrors GET /v1/reconciliation/overdue, per batch: unpaid batches past their due date, most overdue first. */
  listOverdueRemittances(): Promise<DataResult<OverdueRemittance[]>>;
  // None of these audit: each server action calls recordAudit() after it succeeds.
}
