import 'server-only';

import { fromMock, type DataResult } from '../../../data/source';
import { paginate } from '../common';
import { mockNotFound } from '../not-found';
import { daysAgo, SEED_MERCHANTS, type SeedMerchant } from '../seed';
import { createMockCod } from './cod-mock';
import type {
  AdminMoneyService,
  CodRemittance,
  MerchantWallet,
  MoneySummary,
  WalletLedgerEntry,
} from './types';
import { balanceAfter, isAllowedAmount, REASON_MAX, REASON_MIN } from './wallet-adjustment';

// Same balances as the merchants sample data, so both pages agree.
const BALANCES: Record<string, [balance: number, hold: number, rechargedDaysAgo: number | null]> = {
  mer_001: [4_250_000, 180_000, 2],
  mer_002: [1_180_000, 40_000, 9],
  mer_003: [9_640_000, 520_000, 1],
  mer_004: [-120_000, 0, 41],
  mer_005: [2_310_000, 95_000, 5],
  mer_006: [0, 0, null],
  mer_007: [50_000, 0, 1],
  mer_008: [0, 0, null],
};

// Shipments in a day's charge, per merchant with shipments (see the merchants sample data).
const DAILY_SHIPMENTS: Record<string, number> = {
  mer_001: 43,
  mer_002: 21,
  mer_003: 97,
  mer_004: 6,
  mer_005: 50,
};

const PAISE_PER_SHIPMENT = 9_500;
const roundDown = (paise: number, step: number) => Math.max(0, Math.floor(paise / step) * step);

type Draft = Omit<WalletLedgerEntry, 'id' | 'balanceAfterPaise'>;

/**
 * Invented history, newest first, that ends at the merchant's balance: shipping charges since the last
 * recharge, the recharge, then an older charge-and-recharge cycle. Pending merchants have shipped
 * nothing, so they show their recharge only, or nothing.
 */
function sampleLedger(merchant: SeedMerchant, balancePaise: number, rechargedDaysAgo: number | null): WalletLedgerEntry[] {
  if (rechargedDaysAgo === null) return [];
  const perDay = DAILY_SHIPMENTS[merchant.id] ?? 0;
  const charge = (count: number, at: string): Draft => ({
    at,
    kind: 'shipping',
    direction: 'debit',
    amountPaise: count * PAISE_PER_SHIPMENT,
    description: `Shipping charges, ${count} shipments`,
  });
  const recharge = (amountPaise: number, at: string): Draft => ({
    at,
    kind: 'recharge',
    direction: 'credit',
    amountPaise,
    description: 'Wallet recharge',
  });

  // Three charges spread between the recharge and now, newest first.
  const hoursSince = rechargedDaysAgo * 24;
  const recent = perDay
    ? [0.4, 0.6, 0.8].map((share, index) => charge(perDay + index * 3, daysAgo(0, hoursSince * share)))
    : [];
  const spentSince = recent.reduce((sum, entry) => sum + entry.amountPaise, 0);
  // The last recharge leaves a small, non-negative balance before it.
  const lastRecharge = Math.max(50_000, roundDown(balancePaise + spentSince, 50_000));
  const drafts: Draft[] = [...recent, recharge(lastRecharge, daysAgo(rechargedDaysAgo))];

  const before = balancePaise + spentSince - lastRecharge;
  if (perDay) {
    const older = [charge(perDay - 2, daysAgo(rechargedDaysAgo + 2)), charge(perDay + 1, daysAgo(rechargedDaysAgo + 4))];
    const olderSpend = older.reduce((sum, entry) => sum + entry.amountPaise, 0);
    const firstRecharge = roundDown(before + olderSpend, 50_000);
    drafts.push(...older);
    if (firstRecharge > 0) drafts.push(recharge(firstRecharge, daysAgo(rechargedDaysAgo + 6)));
  }

  // Walk from the current balance back in time to fill in each line's balance.
  let running = balancePaise;
  return drafts.map((draft, index) => {
    const entry = { ...draft, id: `txn_${merchant.id.slice(4)}_${String(drafts.length - index).padStart(3, '0')}`, balanceAfterPaise: running };
    running = draft.direction === 'credit' ? running - draft.amountPaise : running + draft.amountPaise;
    return entry;
  });
}

const invalid = (message: string): DataResult<never> => ({
  ok: false,
  source: 'mock',
  error: { kind: 'validation', status: 400, message },
});

/** A fresh sample service. Adjustments change it until the server restarts. */
export function createMockAdminMoneyService(): AdminMoneyService {
  const wallets = new Map<string, MerchantWallet>();
  const ledgers = new Map<string, WalletLedgerEntry[]>();
  for (const merchant of SEED_MERCHANTS) {
    const [balancePaise, holdPaise, rechargedDaysAgo] = BALANCES[merchant.id]!;
    wallets.set(merchant.id, {
      merchantId: merchant.id,
      merchantName: merchant.name,
      balancePaise,
      holdPaise,
      lastRechargeAt: rechargedDaysAgo === null ? null : daysAgo(rechargedDaysAgo),
    });
    ledgers.set(merchant.id, sampleLedger(merchant, balancePaise, rechargedDaysAgo));
  }
  let nextAdjustment = 1;
  const cod = createMockCod();

  return {
    async getSummary() {
      const all = [...wallets.values()];
      const remittances = cod.remittances();
      const open = remittances.filter((batch) => batch.status !== 'reconciled');
      const short = remittances.filter((batch) => batch.status === 'short');
      const gap = (batch: CodRemittance) => Math.max(0, batch.expectedPaise - batch.receivedPaise);
      const summary: MoneySummary = {
        walletFloatPaise: all.reduce((sum, wallet) => sum + Math.max(0, wallet.balancePaise), 0),
        negativeWallets: all.filter((wallet) => wallet.balancePaise < 0).length,
        codOutstandingPaise: open.reduce((sum, batch) => sum + gap(batch), 0),
        shortPaymentsPaise: short.reduce((sum, batch) => sum + gap(batch), 0),
        shortBatches: short.length,
      };
      return fromMock(summary);
    },

    async listWallets() {
      return fromMock([...wallets.values()].map((wallet) => ({ ...wallet })).sort((a, b) => a.balancePaise - b.balancePaise));
    },

    async getMerchantWallet(merchantId) {
      const wallet = wallets.get(merchantId);
      return wallet ? fromMock({ ...wallet }) : mockNotFound('Wallet');
    },

    async getWalletLedger(merchantId, page) {
      const wallet = wallets.get(merchantId);
      if (!wallet) return mockNotFound('Wallet');
      return fromMock({ wallet: { ...wallet }, page: paginate(ledgers.get(merchantId) ?? [], page) });
    },

    async adjustWallet({ merchantId, amountPaise, direction, reason }) {
      const wallet = wallets.get(merchantId);
      if (!wallet) return mockNotFound('Merchant');
      // The action checks these first; the service refuses them too, so no caller can skip the rules.
      if (!isAllowedAmount(amountPaise)) return invalid('The amount is outside the allowed range.');
      if (direction !== 'credit' && direction !== 'debit') return invalid('Choose Credit or Debit.');
      const cleanReason = reason.trim();
      if (cleanReason.length < REASON_MIN || cleanReason.length > REASON_MAX) return invalid('The reason is too short or too long.');

      wallet.balancePaise = balanceAfter(wallet.balancePaise, { amountPaise, direction });
      ledgers.get(merchantId)!.unshift({
        id: `txn_adj_${String(nextAdjustment++).padStart(3, '0')}`,
        at: new Date().toISOString(),
        kind: 'adjustment',
        direction,
        amountPaise,
        balanceAfterPaise: wallet.balancePaise,
        description: cleanReason,
      });
      return fromMock({ ...wallet });
    },

    listRemittances: cod.listRemittances,
    getRemittance: cod.getRemittance,
    reconcileRemittance: cod.reconcileRemittance,
    verifyBankTransfer: cod.verifyBankTransfer,
    listCodExceptions: cod.listCodExceptions,
    resolveCodException: cod.resolveCodException,
    listOverdueRemittances: cod.listOverdueRemittances,
  };
}

// Kept on globalThis so every page and server action in this server sees the same wallets.
const shared = globalThis as typeof globalThis & { evocMockAdminMoney?: AdminMoneyService };

// The kept service outlives hot reloads in `pnpm dev`. When the code gains or loses a method, start a
// fresh one instead of serving the old shape ("… is not a function" until the server restarts).
let methods: string | undefined;
const methodsOf = (service: object) => Object.keys(service).sort().join();

export function mockAdminMoneyService(): AdminMoneyService {
  if (shared.evocMockAdminMoney) {
    methods ??= methodsOf(createMockAdminMoneyService());
    if (methodsOf(shared.evocMockAdminMoney) === methods) return shared.evocMockAdminMoney;
  }
  shared.evocMockAdminMoney = createMockAdminMoneyService();
  return shared.evocMockAdminMoney;
}
