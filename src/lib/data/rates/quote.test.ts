import { describe, expect, it } from 'vitest';
import { mockRatesService } from './mock';
import { priceInPaise, resolveZone, sortQuotes } from './quote';
import type { QuoteInput, RateQuote } from './types';

const SMALL = { lengthCm: 10, widthCm: 10, heightCm: 10 };
const input = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  originPincode: '110001',
  destinationPincode: '110045',
  weightKg: 1,
  dimensions: SMALL,
  paymentType: 'PREPAID',
  ...over,
});

async function quotes(over: Partial<QuoteInput> = {}) {
  const result = await mockRatesService.quote(input(over));
  if (!result.ok) throw new Error('expected quotes');
  return result;
}
const byCarrier = (list: RateQuote[], carrier: string) => list.find((q) => q.carrier === carrier)!;

describe('resolveZone', () => {
  it.each([
    ['110001', '110045', 'A'],
    ['400001', '411001', 'B'],
    ['110001', '400001', 'C'],
    ['110001', '302001', 'D'],
  ])('%s to %s is zone %s', (from, to, zone) => {
    expect(resolveZone(from, to)).toBe(zone);
  });
});

describe('priceInPaise', () => {
  const delhivery = { baseWeightKg: 0.5, basePaise: 3500, additionalPer500gPaise: 1200, codFeePercent: 2, minCodFeePaise: 1000 };
  it('charges only the base price up to the base weight', () => {
    expect(priceInPaise(delhivery, 0.5)).toBe(3500);
    expect(priceInPaise(delhivery, 0.1)).toBe(3500);
  });
  it('adds a started 500 g band at a time, rounded up', () => {
    expect(priceInPaise(delhivery, 1)).toBe(4700);
    expect(priceInPaise(delhivery, 1.01)).toBe(5900);
    expect(priceInPaise(delhivery, 1.2)).toBe(5900);
  });
  it('adds the COD percentage, or the minimum when that is more', () => {
    expect(priceInPaise(delhivery, 1, 100000)).toBe(4700 + 2000);
    expect(priceInPaise(delhivery, 1, 20000)).toBe(4700 + 1000);
    expect(priceInPaise({ ...delhivery, codFeePercent: 2.25, minCodFeePaise: 1200 }, 0.5, 100001)).toBe(3500 + 2251);
  });
});

describe('mock quote', () => {
  it('is marked as sample data and covers every carrier', async () => {
    const result = await quotes();
    expect(result.source).toBe('mock');
    expect(result.data.map((q) => q.carrier).sort()).toEqual(['bluedart', 'delhivery', 'dhl', 'ekart', 'shadowfax']);
  });

  it('prices from the rate card row for the zone', async () => {
    const { data } = await quotes();
    expect(byCarrier(data, 'delhivery')).toMatchObject({ chargePaise: 4700, serviceable: true, chargeableWeightKg: 1 });
    expect(byCarrier(data, 'dhl').chargePaise).toBe(7500 + 3000);
    const far = (await quotes({ destinationPincode: '302001' })).data;
    expect(byCarrier(far, 'delhivery').chargePaise).toBe(5500 + 2200);
  });

  it('bills the volumetric weight when it is larger', async () => {
    const { data } = await quotes({ weightKg: 0.5, dimensions: { lengthCm: 50, widthCm: 30, heightCm: 20 } });
    // 50 x 30 x 20 / 5000 = 6 kg, so 11 bands above the base weight at 12 rupees each.
    expect(byCarrier(data, 'delhivery')).toMatchObject({ chargeableWeightKg: 6, chargePaise: 3500 + 11 * 1200 });
  });

  it('adds the COD fee, and DHL cannot take COD', async () => {
    const { data } = await quotes({ paymentType: 'COD', codAmountPaise: 100000 });
    expect(byCarrier(data, 'delhivery').chargePaise).toBe(4700 + 2000);
    expect(byCarrier(data, 'bluedart').chargePaise).toBe(6800 + 2250);
    expect(byCarrier(data, 'dhl')).toMatchObject({ serviceable: false, codAvailable: false, chargePaise: null, estimatedDays: null });
    expect(byCarrier((await quotes()).data, 'dhl')).toMatchObject({ serviceable: true, codAvailable: false });
  });

  it('marks a carrier that does not reach the destination as not serviceable', async () => {
    const { data } = await quotes({ destinationPincode: '790001' });
    expect(byCarrier(data, 'shadowfax')).toMatchObject({ serviceable: false, chargePaise: null });
  });
});

describe('sortQuotes', () => {
  it('sorts cheapest first and unserviceable last', async () => {
    const { data } = await quotes({ destinationPincode: '790001' });
    const sorted = sortQuotes(data);
    expect(sorted.map((q) => q.carrier)).toEqual(['ekart', 'delhivery', 'bluedart', 'dhl', 'shadowfax']);
    expect(sorted.map((q) => q.chargePaise)).toEqual([7500, 7700, 10400, 13500, null]);
  });
});
