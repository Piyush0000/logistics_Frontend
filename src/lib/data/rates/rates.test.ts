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

  it('describes zones the way the backend decides them', () => {
    expect(ZONE_LABELS.A.description).toBe('Pickup and delivery pincodes start with the same three digits, so both are in the same city or district area.');
    expect(ZONE_LABELS.B.description).toBe('Pickup and delivery are in the same state, but not in the same city or district area.');
    expect(ZONE_LABELS.C.description).toBe('Pickup and delivery are in different states, and both pincodes are in a major metro area.');
    expect(ZONE_LABELS.D.description).toBe('Any other route within India.');
    expect(ZONE_LABELS.E.description).toBe("A sample zone for remote areas. The courier network doesn't define it yet.");
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

  it('has no quote either, because the backend has no serviceability route', async () => {
    expect(
      await gatewayRatesService.quote({
        originPincode: '110001',
        destinationPincode: '400001',
        weightKg: 1,
        dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
        paymentType: 'PREPAID',
      }),
    ).toEqual({
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
