import { CARRIERS } from '@logicore/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewayRatesService } from './gateway';
import { ratesService } from './index';
import { mockRatesService } from './mock';
import { ZONES, ZONE_LABELS } from './types';

describe('mock rate card', () => {
  it('has one row for every carrier and zone, and is marked as sample data', async () => {
    const result = await mockRatesService.getRateCard();
    expect(result.source).toBe('mock');
    if (!result.ok) throw new Error('expected data');
    expect(result.data).toHaveLength(CARRIERS.length * ZONES.length);
    for (const carrier of CARRIERS) {
      for (const zone of ZONES) {
        expect(result.data.filter((row) => row.carrier === carrier && row.zone === zone)).toHaveLength(1);
      }
    }
  });

  it('keeps money as whole paise and prices rising from zone A to E', async () => {
    const result = await mockRatesService.getRateCard();
    if (!result.ok) throw new Error('expected data');
    for (const carrier of CARRIERS) {
      const rows = result.data.filter((row) => row.carrier === carrier);
      for (const row of rows) {
        expect(Number.isInteger(row.basePaise)).toBe(true);
        expect(Number.isInteger(row.additionalPer500gPaise)).toBe(true);
        expect(Number.isInteger(row.minCodFeePaise)).toBe(true);
      }
      expect(rows.map((row) => row.basePaise)).toEqual([...rows.map((row) => row.basePaise)].sort((a, b) => a - b));
    }
  });

  it('describes every zone', () => {
    for (const zone of ZONES) expect(ZONE_LABELS[zone].name.length).toBeGreaterThan(0);
  });
});

describe('gateway rate card', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is unavailable, because the backend has no rate card route', async () => {
    expect(await gatewayRatesService.getRateCard()).toEqual({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
  });

  it('is picked by DATA_SOURCE_RATES', () => {
    vi.stubEnv('DATA_SOURCE_RATES', 'gateway');
    expect(ratesService()).toBe(gatewayRatesService);
    vi.stubEnv('DATA_SOURCE_RATES', 'mock');
    expect(ratesService()).toBe(mockRatesService);
  });
});
