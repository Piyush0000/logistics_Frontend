import { describe, expect, it } from 'vitest';
import { csvCell } from './csv';
import {
  MAX_REPORT_ROWS,
  TRUNCATED_NOTICE,
  mergeCapped,
  pageThrough,
  walletRow,
} from './report-rows';

describe('TRUNCATED_NOTICE', () => {
  it('has the exact wording', () => {
    expect(TRUNCATED_NOTICE).toBe(
      '# Truncated: first 1000 rows. Narrow the date range to see the rest.',
    );
  });
});

const source = (total: number) => async (page: number) => {
  const start = (page - 1) * 100;
  const count = Math.max(0, Math.min(100, total - start));
  return {
    ok: true as const,
    source: 'mock' as const,
    data: { items: Array.from({ length: count }, (_, i) => start + i), total },
  };
};

describe('pageThrough', () => {
  it('marks truncated when more rows exist than the cap', async () => {
    const result = await pageThrough(source(1200));
    expect(result.ok && result.data.items.length).toBe(MAX_REPORT_ROWS);
    expect(result.ok && result.data.truncated).toBe(true);
  });

  it('does not mark truncated at exactly the cap', async () => {
    const result = await pageThrough(source(1000));
    expect(result.ok && result.data.truncated).toBe(false);
  });

  it('does not mark truncated for a short list', async () => {
    const result = await pageThrough(source(40));
    expect(result.ok && result.data.items.length).toBe(40);
    expect(result.ok && result.data.truncated).toBe(false);
  });
});

describe('mergeCapped', () => {
  it('caps the combined rows, not each list', () => {
    const a = { items: Array.from({ length: 600 }, (_, i) => i), truncated: false };
    const b = { items: Array.from({ length: 600 }, (_, i) => 600 + i), truncated: false };
    const merged = mergeCapped([a, b], (x, y) => x - y);
    expect(merged.items.length).toBe(1000);
    expect(merged.truncated).toBe(true);
  });

  it('is not truncated when the combined rows fit', () => {
    const merged = mergeCapped(
      [
        { items: [1], truncated: false },
        { items: [2], truncated: false },
      ],
      (x, y) => x - y,
    );
    expect(merged).toEqual({ items: [1, 2], truncated: false });
  });

  it('is truncated when either list was cut', () => {
    const merged = mergeCapped([{ items: [1], truncated: true }], (x, y) => x - y);
    expect(merged.truncated).toBe(true);
  });
});

describe('walletRow', () => {
  const base = {
    occurredAt: '2026-10-05T10:00:00.000Z',
    title: 'Shipping charge',
    orderRef: null,
  };

  it('writes a debit amount as a plain negative number', () => {
    const row = walletRow({ ...base, direction: 'debit', amountPaise: 1200 } as never);
    expect(csvCell(row[4] ?? '')).toBe('-12.00');
  });

  it('guards a reference that looks like a formula', () => {
    const row = walletRow({ ...base, direction: 'credit', amountPaise: 100, orderRef: '=cmd()' } as never);
    expect(csvCell(row[3] ?? '')).toBe("'=cmd()");
  });
});
