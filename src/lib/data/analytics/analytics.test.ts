import { describe, expect, it, vi } from 'vitest';
import { indianDay } from '../../format/date';
import { gatewayAnalyticsService } from './gateway';
import { analyticsService } from './index';
import { mockAnalyticsService } from './mock';
import { parseRange, sumPoints } from './totals';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

const DAY = /^\d{4}-\d{2}-\d{2}$/;

describe('mock analytics', () => {
  it('returns one point per day, oldest first, ending today in Indian time', async () => {
    for (const days of [7, 30] as const) {
      const result = await mockAnalyticsService.deliveredByDay(days);
      expect(result.ok && result.source).toBe('mock');
      const points = result.ok ? result.data : [];
      expect(points).toHaveLength(days);
      for (const point of points) expect(point.day).toMatch(DAY);
      expect(points.map((p) => p.day)).toEqual([...points.map((p) => p.day)].sort());
      expect(points.at(-1)!.day).toBe(indianDay(new Date()));
      for (const point of points) expect(Number.isInteger(point.value) && point.value >= 0).toBe(true);
    }
  });

  it('makes the 7-day series the end of the 30-day series', async () => {
    const seven = await mockAnalyticsService.deliveredByDay(7);
    const thirty = await mockAnalyticsService.deliveredByDay(30);
    expect(seven.ok && thirty.ok).toBe(true);
    if (seven.ok && thirty.ok) expect(seven.data).toEqual(thirty.data.slice(-7));
  });

  it('totals revenue from daily points', async () => {
    const result = await mockAnalyticsService.revenueByDay(7);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { freightPaise, codPaise } = result.data;
    expect(freightPaise).toHaveLength(7);
    expect(codPaise).toHaveLength(7);
    expect(sumPoints(freightPaise)).toBe(freightPaise.reduce((sum, p) => sum + p.value, 0));
    expect(sumPoints(freightPaise)).toBeGreaterThan(0);
    expect(sumPoints(codPaise)).toBeGreaterThan(0);
    // One day is wide enough to need compact chart labels.
    const thirty = await mockAnalyticsService.revenueByDay(30);
    expect(thirty.ok).toBe(true);
    if (thirty.ok) {
      expect(Math.max(...thirty.data.codPaise.map((p) => p.value))).toBeGreaterThanOrEqual(10_000_000);
    }
  });
});

describe('sumPoints', () => {
  it('adds values and ignores NaN and negatives', () => {
    expect(sumPoints([])).toBe(0);
    expect(
      sumPoints([
        { day: '2026-11-01', value: 5 },
        { day: '2026-11-02', value: Number.NaN },
        { day: '2026-11-03', value: -9 },
        { day: '2026-11-04', value: 7 },
      ]),
    ).toBe(12);
  });
});

describe('parseRange', () => {
  it('accepts 7 and 30 and falls back to 7', () => {
    expect(parseRange('30')).toBe(30);
    expect(parseRange('7')).toBe(7);
    for (const bad of [undefined, 'FOO', '', '14', '-1', ['30', '7']]) expect(parseRange(bad)).toBe(7);
  });
});

describe('gateway analytics', () => {
  it('reads daily deliveries and money from the analytics API', async () => {
    const day = [{ day: '2026-11-22', value: 3 }];
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) =>
      Response.json(url.includes('/delivered') ? { items: day } : { freight: day, cod: [{ day: '2026-11-22', value: 99_800 }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await gatewayAnalyticsService.deliveredByDay(7)).toMatchObject({ ok: true, data: day });
    expect(await gatewayAnalyticsService.revenueByDay(30)).toMatchObject({
      ok: true,
      data: { freightPaise: day, codPaise: [{ value: 99_800 }] },
    });
    expect(new URL(String(fetchMock.mock.calls[1]![0])).searchParams.get('days')).toBe('30');
    vi.unstubAllGlobals();
  });

  it('is picked by DATA_SOURCE_ANALYTICS', () => {
    expect(analyticsService()).toBe(mockAnalyticsService);
    process.env.DATA_SOURCE_ANALYTICS = 'gateway';
    try {
      expect(analyticsService()).toBe(gatewayAnalyticsService);
    } finally {
      delete process.env.DATA_SOURCE_ANALYTICS;
    }
  });
});
