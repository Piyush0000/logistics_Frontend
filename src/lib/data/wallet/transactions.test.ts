import { describe, expect, it, vi } from 'vitest';
vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'demo-token' }));
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
        expect(breakdown.freightPaise + breakdown.otherPaise + breakdown.codPaise).toBe(
          amountPaise,
        );
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
    const data = await list({ debitType: 'weight' });

    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.entries.every(({ debitType }) => debitType === 'weight')).toBe(true);
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
  it('lists the wallet ledger lines from the gateway, never sample data', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () =>
      Response.json({
        items: [
          {
            id: 'e1',
            at: '2026-11-21T10:00:00.000Z',
            direction: 'debit',
            amount_paise: 7200,
            reason: 'Charge RTO handling fee',
            kind: 'rto',
            awb: 'EVS8516979039',
          },
          {
            id: 'e2',
            at: '2026-11-20T10:00:00.000Z',
            direction: 'credit',
            amount_paise: 500,
            reason: 'Release shipment reservation',
            kind: 'shipping',
          },
        ],
        page: 1,
        limit: 10,
        total: 12,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await gatewayWalletService.listTransactions({
      ...DEFAULT_FILTERS,
      type: 'debit',
      from: '2026-11-01',
    });
    vi.unstubAllGlobals();

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/api/v1/wallet/transactions?page=1&limit=10&direction=debit&from=2026-11-01',
    );
    expect(result).toMatchObject({
      ok: true,
      source: 'gateway',
      data: { page: 1, pageCount: 2, total: 12 },
    });
    if (!result.ok) return;
    expect(result.data.entries[0]).toMatchObject({
      direction: 'debit',
      debitType: 'rto',
      amountPaise: 7200,
      orderRef: 'EVS8516979039',
      breakdown: { freightPaise: 7200, otherPaise: 0, codPaise: 0 },
    });
    expect(result.data.entries[1]).toMatchObject({ direction: 'credit', debitType: null });
  });

  it('opens the Razorpay page the ledger made, and checks a payment by id', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
      Response.json({
        id: '6f1c2a4e-1b2c-4d5e-8f90-123456789abc',
        status: String(url).endsWith('/confirm') ? 'PAID' : 'CREATED',
        amount_paise: 150_000,
        credited_paise: String(url).endsWith('/confirm') ? 150_000 : null,
        payment_url: String(url).endsWith('/confirm') ? null : 'https://rzp.io/i/plink_1',
        method: init?.method,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await gatewayWalletService.startRecharge(150_000)).toMatchObject({
      ok: true,
      data: { paymentUrl: 'https://rzp.io/i/plink_1' },
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/v1/wallet/recharge');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ amount_paise: 150_000 }) });
    expect(
      await gatewayWalletService.confirmRecharge('6f1c2a4e-1b2c-4d5e-8f90-123456789abc'),
    ).toMatchObject({
      ok: true,
      data: { status: 'PAID', creditedPaise: 150_000 },
    });
    vi.unstubAllGlobals();
  });

  it('never fakes a recharge when the gateway fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'UPSTREAM_UNAVAILABLE' }, { status: 502 })),
    );
    expect(await gatewayWalletService.startRecharge(10_000)).toMatchObject({
      ok: false,
      source: 'gateway',
    });
    vi.unstubAllGlobals();
  });
});

describe('walletService', () => {
  it('offers transactions from whichever source is selected', async () => {
    const result = await walletService().listTransactions(DEFAULT_FILTERS);

    expect(result.source).toBe('mock');
  });
});
