import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, DEBIT_TYPES, hasActiveFilters, parseWalletFilters, walletHref } from './filters';

describe('parseWalletFilters', () => {
  it('uses the defaults when the URL has no filters', () => {
    expect(parseWalletFilters({})).toEqual({ filters: DEFAULT_FILTERS, error: null });
  });

  it('reads valid filters', () => {
    const { filters, error } = parseWalletFilters({
      type: 'debit',
      debitType: 'weight-discrepancy',
      from: '2026-10-01',
      to: '2026-10-31',
      page: '3',
    });

    expect(error).toBeNull();
    expect(filters).toEqual({
      type: 'debit',
      debitType: 'weight-discrepancy',
      from: '2026-10-01',
      to: '2026-10-31',
      page: 3,
    });
  });

  it('ignores values it does not recognise', () => {
    const { filters } = parseWalletFilters({
      type: 'refund',
      debitType: 'nonsense',
      from: 'yesterday',
      to: '2026-02-31',
      page: '-2',
    });

    expect(filters).toEqual(DEFAULT_FILTERS);
  });

  it('uses the first value when a parameter repeats', () => {
    expect(parseWalletFilters({ type: ['debit', 'credit'] }).filters.type).toBe('debit');
  });

  it('drops the debit type for credit-only views, because they cannot both apply', () => {
    const { filters } = parseWalletFilters({ type: 'credit', debitType: 'invoice-payment' });

    expect(filters.debitType).toBe('all');
  });

  it('reports a date range that runs backwards', () => {
    const { error } = parseWalletFilters({ from: '2026-10-31', to: '2026-10-01' });

    expect(error).toBe('From Date must be on or before To Date.');
  });

  it('accepts a single-day range', () => {
    expect(parseWalletFilters({ from: '2026-10-05', to: '2026-10-05' }).error).toBeNull();
  });
});

describe('walletHref', () => {
  it('leaves defaults out of the URL', () => {
    expect(walletHref(DEFAULT_FILTERS)).toBe('/finances/wallet');
  });

  it('keeps the filters when changing page', () => {
    const href = walletHref({ ...DEFAULT_FILTERS, type: 'debit', from: '2026-10-01' }, 2);

    expect(href).toBe('/finances/wallet?type=debit&from=2026-10-01&page=2');
  });

  it('leaves page 1 out of the URL', () => {
    expect(walletHref({ ...DEFAULT_FILTERS, page: 4 }, 1)).toBe('/finances/wallet');
  });
});

describe('hasActiveFilters', () => {
  it('ignores the page number', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, page: 2 })).toBe(false);
  });

  it('notices any filter', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, to: '2026-10-01' })).toBe(true);
  });
});

describe('DEBIT_TYPES', () => {
  it('has unique values', () => {
    expect(new Set(DEBIT_TYPES.map(({ value }) => value)).size).toBe(DEBIT_TYPES.length);
  });
});
