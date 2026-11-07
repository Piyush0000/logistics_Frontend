import { describe, expect, it } from 'vitest';
import { walletService } from '.';
import { DEFAULT_FILTERS, type WalletFilters } from './filters';
import { gatewayWalletService } from './gateway';
import { mockWalletService, PAGE_SIZE, SAMPLE_TRANSACTIONS } from './mock';

const list = async (filters: Partial<WalletFilters> = {}) => {
  const result = await mockWalletService.listTransactions({ ...DEFAULT_FILTERS, ...filters });
  if (!result.ok) throw new Error('The sample wallet should not fail');
  return result.data;
};

describe('sample transactions', () => {
  it('are labelled as sample data', async () => {
    const result = await mockWalletService.listTransactions(DEFAULT_FILTERS);

    expect(result.source).toBe('mock');
  });

  it('are newest first', () => {
    const times = SAMPLE_TRANSACTIONS.map(({ occurredAt }) => Date.parse(occurredAt));

    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('have whole-paise amounts and breakdowns that add up', () => {
    for (const { amountPaise, breakdown } of SAMPLE_TRANSACTIONS) {
      expect(Number.isInteger(amountPaise)).toBe(true);
      expect(amountPaise).toBeGreaterThan(0);
      if (breakdown) {
        expect(breakdown.freightPaise + breakdown.otherPaise + breakdown.codPaise).toBe(amountPaise);
      }
    }
  });

  it('give every debit a type, and no credit a debit type', () => {
    for (const { direction, debitType } of SAMPLE_TRANSACTIONS) {
      expect(debitType === null).toBe(direction === 'credit');
    }
  });

  it('use visibly fake order references', () => {
    for (const { orderRef } of SAMPLE_TRANSACTIONS) {
      if (orderRef) expect(orderRef).toMatch(/^DEMO-/);
    }
  });
});

describe('listTransactions', () => {
  it('returns the first page by default', async () => {
    const data = await list();

    expect(data.page).toBe(1);
    expect(data.entries).toHaveLength(PAGE_SIZE);
    expect(data.entries[0]).toEqual(SAMPLE_TRANSACTIONS[0]);
    expect(data.pageCount).toBe(Math.ceil(SAMPLE_TRANSACTIONS.length / PAGE_SIZE));
  });

  it('returns later pages', async () => {
    const data = await list({ page: 2 });

    expect(data.entries[0]).toEqual(SAMPLE_TRANSACTIONS[PAGE_SIZE]);
  });

  it('moves a page past the end back to the last page', async () => {
    const data = await list({ page: 999 });

    expect(data.page).toBe(data.pageCount);
    expect(data.entries.length).toBeGreaterThan(0);
  });

  it('filters by direction', async () => {
    const credits = await list({ type: 'credit' });

    expect(credits.entries.length).toBeGreaterThan(0);
    expect(credits.entries.every(({ direction }) => direction === 'credit')).toBe(true);
  });

  it('filters by debit type', async () => {
    const data = await list({ debitType: 'weight-discrepancy' });

    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.entries.every(({ debitType }) => debitType === 'weight-discrepancy')).toBe(true);
  });

  it('includes both ends of a date range, using Indian days', async () => {
    // txn-001 is 18:31 UTC, already 30 October in India. txn-002 is 18:29 UTC, still the 29th.
    const data = await list({ from: '2026-10-29', to: '2026-10-29' });

    expect(data.entries.map(({ id }) => id)).toEqual(['txn-002']);
  });

  it('is empty when nothing matches', async () => {
    const data = await list({ from: '2020-01-01', to: '2020-01-31' });

    expect(data).toMatchObject({ entries: [], page: 1, pageCount: 1, total: 0 });
  });
});

describe('gateway wallet service', () => {
  it('never passes off missing routes as data', async () => {
    const result = await gatewayWalletService.listTransactions(DEFAULT_FILTERS);

    expect(result).toMatchObject({ ok: false, source: 'gateway' });
  });
});

describe('walletService', () => {
  it('offers transactions from whichever source is selected', async () => {
    const result = await walletService().listTransactions(DEFAULT_FILTERS);

    expect(result.source).toBe('mock');
  });
});
