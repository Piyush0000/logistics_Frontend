import { describe, expect, it } from 'vitest';
import { codHref, DEFAULT_COD_FILTERS, hasActiveCodFilters, parseCodFilters } from './filters';

describe('parseCodFilters', () => {
  it('uses the defaults when the URL has no filters', () => {
    expect(parseCodFilters({})).toEqual({ filters: DEFAULT_COD_FILTERS, error: null });
  });

  it('reads valid filters', () => {
    const { filters, error } = parseCodFilters({
      status: 'settled',
      from: '2026-10-01',
      to: '2026-10-31',
      page: '2',
      perPage: '50',
    });

    expect(error).toBeNull();
    expect(filters).toEqual({
      status: 'settled',
      from: '2026-10-01',
      to: '2026-10-31',
      page: 2,
      perPage: 50,
    });
  });

  it('ignores values it does not recognise', () => {
    const { filters } = parseCodFilters({
      status: 'lost',
      from: 'soon',
      to: '2026-02-31',
      page: '0',
      perPage: '7',
    });

    expect(filters).toEqual(DEFAULT_COD_FILTERS);
  });

  it('reports a date range that runs backwards', () => {
    const { error } = parseCodFilters({ from: '2026-10-31', to: '2026-10-01' });

    expect(error).toBe('From Date must be on or before To Date.');
  });
});

describe('codHref', () => {
  it('leaves defaults out of the URL', () => {
    expect(codHref(DEFAULT_COD_FILTERS)).toBe('/finances/cod');
  });

  it('keeps filters and page size when changing page', () => {
    const filters = { ...DEFAULT_COD_FILTERS, status: 'pending' as const, perPage: 10 as const };

    expect(codHref(filters, { page: 2 })).toBe('/finances/cod?status=pending&perPage=10&page=2');
  });

  it('can point somewhere else with the same filters', () => {
    const filters = { ...DEFAULT_COD_FILTERS, status: 'settled' as const, page: 3 };

    expect(codHref(filters, { path: '/finances/cod/export' })).toBe(
      '/finances/cod/export?status=settled',
    );
  });
});

describe('hasActiveCodFilters', () => {
  it('ignores the page and page size', () => {
    expect(hasActiveCodFilters({ ...DEFAULT_COD_FILTERS, page: 2, perPage: 50 })).toBe(false);
  });

  it('notices a filter', () => {
    expect(hasActiveCodFilters({ ...DEFAULT_COD_FILTERS, status: 'pending' })).toBe(true);
  });
});
