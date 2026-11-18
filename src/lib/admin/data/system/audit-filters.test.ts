import { describe, expect, it } from 'vitest';
import { auditHref, DEFAULT_AUDIT_FILTERS, parseAuditFilters } from './audit-filters';

describe('parseAuditFilters', () => {
  it('uses the defaults when the URL has no filters', () => {
    expect(parseAuditFilters({})).toEqual({ filters: DEFAULT_AUDIT_FILTERS, notice: null });
  });

  it('reads valid filters', () => {
    expect(
      parseAuditFilters({ action: 'Wallet credit', from: '2026-11-01', to: '2026-11-15', page: '2' }),
    ).toEqual({
      filters: { action: 'Wallet credit', from: '2026-11-01', to: '2026-11-15', page: 2 },
      notice: null,
    });
  });

  it('ignores values it cannot use, rather than failing', () => {
    const { filters } = parseAuditFilters({
      action: 'x'.repeat(200),
      from: 'yesterday',
      to: '2026-02-31',
      page: '-3',
    });

    expect(filters).toEqual(DEFAULT_AUDIT_FILTERS);
  });

  it('uses the first value when a parameter repeats', () => {
    expect(parseAuditFilters({ action: ['Wallet credit', 'Courier disabled'] }).filters.action).toBe(
      'Wallet credit',
    );
  });

  it('drops a date range that runs backwards, and says so', () => {
    const { filters, notice } = parseAuditFilters({ from: '2026-11-15', to: '2026-11-01' });

    expect(filters).toMatchObject({ from: '', to: '' });
    expect(notice).toBe('The dates were ignored, because To Date was before From Date.');
  });

  it('accepts a single day', () => {
    expect(parseAuditFilters({ from: '2026-11-05', to: '2026-11-05' }).notice).toBeNull();
  });
});

describe('auditHref', () => {
  it('leaves defaults out of the URL', () => {
    expect(auditHref(DEFAULT_AUDIT_FILTERS)).toBe('/admin/system');
  });

  it('keeps the filters when changing page', () => {
    const filters = { ...DEFAULT_AUDIT_FILTERS, action: 'Wallet credit', from: '2026-11-01' };

    expect(auditHref(filters, 3)).toBe(
      '/admin/system?action=Wallet+credit&from=2026-11-01&page=3',
    );
  });
});
