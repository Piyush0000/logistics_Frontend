import 'server-only';

import { fromMock } from '../../../data/source';
import { mockNotFound } from '../not-found';
import { daysAgo, SEED_MERCHANTS } from '../seed';
import type { AdminMoneyService, CodRemittance, MerchantWallet } from './types';

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

const WALLETS: MerchantWallet[] = SEED_MERCHANTS.map((merchant) => {
  const [balancePaise, holdPaise, rechargedDaysAgo] = BALANCES[merchant.id]!;
  return {
    merchantId: merchant.id,
    merchantName: merchant.name,
    balancePaise,
    holdPaise,
    lastRechargeAt: rechargedDaysAgo === null ? null : daysAgo(rechargedDaysAgo),
  };
});

const day = (offset: number) => daysAgo(offset).slice(0, 10);

const REMITTANCES: CodRemittance[] = [
  { id: 'rem_dl_1102', carrier: 'delhivery', periodEnd: day(12), expectedPaise: 18_450_000, receivedPaise: 18_450_000, status: 'reconciled' },
  { id: 'rem_ek_1105', carrier: 'ekart', periodEnd: day(9), expectedPaise: 9_820_000, receivedPaise: 9_610_000, status: 'short' },
  { id: 'rem_bd_1108', carrier: 'bluedart', periodEnd: day(6), expectedPaise: 6_300_000, receivedPaise: 6_300_000, status: 'received' },
  { id: 'rem_sf_1110', carrier: 'shadowfax', periodEnd: day(4), expectedPaise: 4_150_000, receivedPaise: 0, status: 'expected' },
  { id: 'rem_dl_1112', carrier: 'delhivery', periodEnd: day(2), expectedPaise: 21_070_000, receivedPaise: 0, status: 'expected' },
];

export const mockAdminMoneyService: AdminMoneyService = {
  async listWallets() {
    return fromMock([...WALLETS].sort((a, b) => a.balancePaise - b.balancePaise));
  },

  async getMerchantWallet(merchantId) {
    const wallet = WALLETS.find((entry) => entry.merchantId === merchantId);
    return wallet ? fromMock(wallet) : mockNotFound('Wallet');
  },

  async listRemittances() {
    return fromMock([...REMITTANCES].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)));
  },
};
