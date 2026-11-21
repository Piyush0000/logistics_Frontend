import { describe, expect, it } from 'vitest';
import { createMockAdminMoneyService } from './mock';
import type { DataResult } from '../../../data/source';
import { MAX_ADJUSTMENT_PAISE } from './wallet-adjustment';

function data<T>(result: DataResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const adjustment = { merchantId: 'mer_002', amountPaise: 50_000, direction: 'credit' as const, reason: 'Goodwill credit' };

describe('mock wallet ledger', () => {
  it('ends every ledger at the wallet balance, with each line adding up', async () => {
    const service = createMockAdminMoneyService();
    for (const wallet of data(await service.listWallets())) {
      const entries = data(await service.getWalletLedger(wallet.merchantId, 1)).page.items;
      if (entries.length === 0) continue;
      expect(entries[0]!.balanceAfterPaise, wallet.merchantId).toBe(wallet.balancePaise);
      for (let i = 0; i < entries.length - 1; i += 1) {
        const [newer, older] = [entries[i]!, entries[i + 1]!];
        const signed = newer.direction === 'credit' ? newer.amountPaise : -newer.amountPaise;
        expect(older.balanceAfterPaise + signed, `${wallet.merchantId} ${newer.id}`).toBe(newer.balanceAfterPaise);
        expect(newer.at >= older.at, `${wallet.merchantId} ${newer.id} is newer`).toBe(true);
      }
      const oldest = entries.at(-1)!;
      const opening = oldest.balanceAfterPaise - (oldest.direction === 'credit' ? oldest.amountPaise : -oldest.amountPaise);
      expect(opening, `${wallet.merchantId} opening balance`).toBeGreaterThanOrEqual(0);
      expect(entries.every((entry) => entry.amountPaise > 0 && Number.isInteger(entry.amountPaise))).toBe(true);
    }
  });

  it('gives pending merchants no shipping charges', async () => {
    const service = createMockAdminMoneyService();
    for (const id of ['mer_006', 'mer_007', 'mer_008']) {
      const entries = data(await service.getWalletLedger(id, 1)).page.items;
      expect(entries.some((entry) => entry.kind === 'shipping'), id).toBe(false);
    }
  });

  it('answers not_found for an unknown merchant', async () => {
    const service = createMockAdminMoneyService();
    const result = await service.getWalletLedger('mer_999', 1);
    expect(result.ok ? null : result.error.kind).toBe('not_found');
  });
});

describe('mock adjustWallet', () => {
  it('credits the wallet, adds the line first and shows on every read', async () => {
    const service = createMockAdminMoneyService();
    const before = data(await service.getMerchantWallet('mer_002')).balancePaise;

    const updated = data(await service.adjustWallet(adjustment));

    expect(updated.balancePaise).toBe(before + 50_000);
    expect(data(await service.getMerchantWallet('mer_002')).balancePaise).toBe(before + 50_000);
    expect(data(await service.listWallets()).find((wallet) => wallet.merchantId === 'mer_002')!.balancePaise).toBe(
      before + 50_000,
    );
    const [first] = data(await service.getWalletLedger('mer_002', 1)).page.items;
    expect(first).toMatchObject({
      kind: 'adjustment',
      direction: 'credit',
      amountPaise: 50_000,
      balanceAfterPaise: before + 50_000,
      description: 'Goodwill credit',
    });
  });

  it('lets a debit take a wallet below zero, and counts it in the summary', async () => {
    const service = createMockAdminMoneyService();
    const negativeBefore = data(await service.getSummary()).negativeWallets;
    const updated = data(await service.adjustWallet({ ...adjustment, merchantId: 'mer_007', amountPaise: 60_000, direction: 'debit' }));
    expect(updated.balancePaise).toBe(-10_000);
    expect(data(await service.getSummary()).negativeWallets).toBe(negativeBefore + 1);
  });

  it('numbers adjustments in order, newest first', async () => {
    const service = createMockAdminMoneyService();
    await service.adjustWallet(adjustment);
    await service.adjustWallet({ ...adjustment, reason: 'Second adjustment' });
    const items = data(await service.getWalletLedger('mer_002', 1)).page.items;
    expect(items.slice(0, 2).map((entry) => [entry.id, entry.description])).toEqual([
      ['txn_adj_002', 'Second adjustment'],
      ['txn_adj_001', 'Goodwill credit'],
    ]);
  });

  it('refuses an unknown merchant', async () => {
    const service = createMockAdminMoneyService();
    const result = await service.adjustWallet({ ...adjustment, merchantId: 'mer_999' });
    expect(result.ok ? null : result.error.kind).toBe('not_found');
  });

  it.each([0, -100, MAX_ADJUSTMENT_PAISE + 1, 10.5, Number.NaN])('refuses %d paise and leaves the balance alone', async (amountPaise) => {
    const service = createMockAdminMoneyService();
    const before = data(await service.getMerchantWallet('mer_002')).balancePaise;
    const result = await service.adjustWallet({ ...adjustment, amountPaise });
    expect(result.ok ? null : result.error.kind).toBe('validation');
    expect(data(await service.getMerchantWallet('mer_002')).balancePaise).toBe(before);
  });

  it('refuses a missing reason or an unknown direction', async () => {
    const service = createMockAdminMoneyService();
    expect((await service.adjustWallet({ ...adjustment, reason: '   ' })).ok).toBe(false);
    expect((await service.adjustWallet({ ...adjustment, direction: 'refund' as never })).ok).toBe(false);
  });

  it('keeps separate services separate', async () => {
    const one = createMockAdminMoneyService();
    const two = createMockAdminMoneyService();
    await one.adjustWallet(adjustment);
    expect(data(await two.getMerchantWallet('mer_002')).balancePaise).toBe(1_180_000);
  });
});

describe('mock money summary', () => {
  it('adds up the float, negative wallets, COD outstanding and short payments', async () => {
    const summary = data(await createMockAdminMoneyService().getSummary());
    // Wallets above zero: 42,500 + 11,800 + 96,400 + 23,100 + 500 rupees.
    expect(summary.walletFloatPaise).toBe(17_430_000);
    expect(summary.negativeWallets).toBe(1);
    // Not fully reconciled: ekart short 2,100, bluedart short 450, dhl paid in full,
    // shadowfax 35,600 and 41,500, delhivery 2,10,700 rupees.
    expect(summary.codOutstandingPaise).toBe(29_035_000);
    expect(summary.shortPaymentsPaise).toBe(210_000);
    expect(summary.shortBatches).toBe(1);
  });
});

