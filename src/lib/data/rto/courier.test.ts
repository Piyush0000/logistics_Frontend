import { describe, expect, it } from 'vitest';
import { collectRto, rtoByCourier, rtoChartNote } from './courier';

const s = (carrier: string) => ({ carrier });

describe('rtoByCourier', () => {
  it('counts shipments per courier with display names, most first', () => {
    const data = rtoByCourier([s('ekart'), s('bluedart'), s('ekart'), s('delhivery'), s('ekart'), s('bluedart')]);
    expect(data).toEqual([
      { label: 'Ekart', value: 3 },
      { label: 'Blue Dart', value: 2 },
      { label: 'Delhivery', value: 1 },
    ]);
  });

  it('merges carriers that differ only in case', () => {
    expect(rtoByCourier([s('EKART'), s('ekart')])).toEqual([{ label: 'Ekart', value: 2 }]);
  });

  it('returns nothing for no shipments', () => {
    expect(rtoByCourier([])).toEqual([]);
  });
});

describe('collectRto', () => {
  const page = (n: number, count: number, total: number) => ({
    ok: true as const,
    source: 'mock' as const,
    data: {
      items: Array.from({ length: count }, (_, i) => ({ carrier: `c${n}-${i}` }) as never),
      page: n,
      limit: 2,
      total,
    },
  });

  it('reads every page of every stage', async () => {
    const calls: string[] = [];
    const result = await collectRto(async ({ stage, page: n }) => {
      calls.push(`${stage}:${n}`);
      return page(n, stage === 'in_progress' ? (n === 3 ? 1 : 2) : 1, stage === 'in_progress' ? 5 : 1);
    });
    expect(calls).toEqual(['in_progress:1', 'delivered:1', 'in_progress:2', 'in_progress:3']);
    expect(result).toMatchObject({ ok: true, data: { total: 6, capped: false } });
    expect(result.ok && result.data.items).toHaveLength(6);
  });

  it('stops at 20 pages per stage and says it was capped', async () => {
    let calls = 0;
    const result = await collectRto(async ({ page: n }) => {
      calls += 1;
      return page(n, 2, 100);
    });
    expect(calls).toBe(40);
    expect(result).toMatchObject({ ok: true, data: { total: 200, capped: true } });
    expect(result.ok && result.data.items).toHaveLength(80);
  });

  it('returns the first failure', async () => {
    const result = await collectRto(async ({ stage }) =>
      stage === 'delivered'
        ? { ok: false, source: 'gateway', error: { kind: 'network', status: 0, message: 'down' } }
        : page(1, 1, 1),
    );
    expect(result.ok).toBe(false);
  });
});

describe('rtoChartNote', () => {
  it('is empty when the chart covers every shipment', () => {
    expect(rtoChartNote(13, 13, false)).toBeNull();
  });
  it('says latest when capped', () => {
    expect(rtoChartNote(80, 200, true)).toBe('Based on the latest 80 of 200 RTO shipments.');
  });
  it('says how many it covers when the list is shorter than the counts', () => {
    expect(rtoChartNote(2, 13, false)).toBe('Based on 2 of 13 RTO shipments.');
  });
});
