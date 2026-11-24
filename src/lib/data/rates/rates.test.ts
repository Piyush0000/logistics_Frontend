import { CARRIERS } from '@logicore/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewayRatesService } from './gateway';

import { ratesService } from './index';
import { mockRatesService } from './mock';
import { ZONES, ZONE_LABELS } from './types';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

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
    expect(ZONE_LABELS.E.description).toMatch(/North-east.*Lakshadweep/);
  });

  it('describes every zone', () => {
    for (const zone of ZONES) expect(ZONE_LABELS[zone].name.length).toBeGreaterThan(0);
  });
});

describe('gateway rate card', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('maps the backend zones to A to D and drops any it does not know', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          items: [
            {
              carrier: 'delhivery',
              zone: 'metro-metro',
              base_weight_kg: 0.5,
              base_paise: 4500,
              additional_per_500g_paise: 1700,
              cod_fee_percent: 2,
              min_cod_fee_paise: 1000,
            },
            {
              carrier: 'delhivery',
              zone: 'moon',
              base_weight_kg: 0.5,
              base_paise: 1,
              additional_per_500g_paise: 1,
              cod_fee_percent: 0,
              min_cod_fee_paise: 0,
            },
          ],
        }),
      ),
    );
    expect(await gatewayRatesService.getRateCard()).toEqual({
      ok: true,
      source: 'gateway',
      data: [
        {
          carrier: 'delhivery',
          zone: 'C',
          baseWeightKg: 0.5,
          basePaise: 4500,
          additionalPer500gPaise: 1700,
          codFeePercent: 2,
          minCodFeePaise: 1000,
        },
      ],
    });
    vi.unstubAllGlobals();
  });

  it('asks for a quote on the chargeable weight, with the COD amount', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      Response.json({
        items: [
          {
            carrier: 'delhivery',
            serviceable: true,
            cod_available: true,
            estimated_days: 3,
            chargeable_weight_kg: 2,
            total_paise: 12_000,
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await gatewayRatesService.quote({
      originPincode: '110001',
      destinationPincode: '400001',
      weightKg: 1,
      // 30 x 20 x 15 cm is 1.8 kg volumetric: billed on that, not the 1 kg actual.
      dimensions: { lengthCm: 30, widthCm: 20, heightCm: 15 },
      paymentType: 'COD',
      codAmountPaise: 99_800,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      origin_pincode: '110001',
      destination_pincode: '400001',
      weight_kg: 1.8,
      payment_type: 'COD',
      cod_amount_paise: 99_800,
    });
    expect(result).toMatchObject({
      ok: true,
      data: [{ carrier: 'delhivery', serviceable: true, chargePaise: 12_000, estimatedDays: 3 }],
    });
    vi.unstubAllGlobals();
  });

  it('is picked by DATA_SOURCE_RATES', () => {
    vi.stubEnv('DATA_SOURCE_RATES', 'gateway');
    expect(ratesService()).toBe(gatewayRatesService);
    vi.stubEnv('DATA_SOURCE_RATES', 'mock');
    expect(ratesService()).toBe(mockRatesService);
  });
});
