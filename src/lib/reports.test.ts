import { describe, expect, it } from 'vitest';
import { defaultReportRange, reportColumns, reportFileName, validateReport } from './reports';

const ok = (type: string, from: string, to: string) => validateReport({ type, from, to });

describe('validateReport', () => {
  it('accepts a valid request', () => {
    expect(ok('shipments', '2026-10-01', '2026-10-31')).toEqual({
      ok: true,
      value: { type: 'shipments', from: '2026-10-01', to: '2026-10-31' },
    });
  });

  it('accepts a single day', () => {
    expect(ok('cod', '2026-10-01', '2026-10-01').ok).toBe(true);
  });

  it('accepts a 92-day range', () => {
    expect(ok('wallet', '2026-01-01', '2026-04-02').ok).toBe(true);
  });

  it('rejects a 93-day range', () => {
    const result = ok('wallet', '2026-01-01', '2026-04-03');
    expect(result.ok).toBe(false);
  });

  it('rejects to before from', () => {
    const result = ok('ndr', '2026-10-10', '2026-10-09');
    expect(result).toEqual({ ok: false, message: 'To date must be on or after From date.' });
  });

  it('rejects an unknown type', () => {
    expect(ok('everything', '2026-10-01', '2026-10-02').ok).toBe(false);
    expect(validateReport(null).ok).toBe(false);
  });

  it('rejects bad dates', () => {
    expect(ok('rto', '2026-13-01', '2026-10-02').ok).toBe(false);
    expect(ok('rto', '2026-10-01', '1 Oct').ok).toBe(false);
    expect(validateReport({ type: 'rto' }).ok).toBe(false);
  });
});

describe('defaultReportRange', () => {
  it('is the last 30 days in Indian time', () => {
    expect(defaultReportRange(new Date('2026-11-11T05:00:00Z'))).toEqual({
      from: '2026-10-13',
      to: '2026-11-11',
    });
  });

  it('uses the Indian day when UTC is still the day before', () => {
    expect(defaultReportRange(new Date('2026-11-10T20:00:00Z')).to).toBe('2026-11-11');
  });
});

describe('report helpers', () => {
  it('names the file from validated values', () => {
    expect(reportFileName({ type: 'rto', from: '2026-10-01', to: '2026-10-31' })).toBe(
      'rto-2026-10-01-to-2026-10-31.csv',
    );
  });

  it('has columns for every type', () => {
    expect(reportColumns('shipments')[1]).toBe('AWB');
    expect(reportColumns('wallet')).toContain('Amount');
  });
});
