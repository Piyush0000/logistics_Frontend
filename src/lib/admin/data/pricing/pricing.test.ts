import { describe, expect, it } from 'vitest';
import type { DataResult } from '../../../data/source';
import { gatewayAdminPricingService } from './gateway';
import { createMockAdminPricingService } from './mock';
import {
  COD_MINIMUM_MESSAGE,
  COD_PERCENT_MESSAGE,
  DISCOUNT_MESSAGE,
  parsePercent,
  parseRateFilters,
  PRICE_MESSAGE,
  rateFiltersHref,
  REASON_MESSAGE,
  rupeesToPaise,
  validateOverride,
  validateRate,
} from './pricing-rules';

function data<T>(result: DataResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
const errorKind = (result: DataResult<unknown>) => (result.ok ? null : result.error.kind);

describe('rupeesToPaise and parsePercent', () => {
  it.each([
    ['43', 4_300],
    ['43.5', 4_350],
    ['1,000.05', 100_005],
    ['0.29', 29],
  ])('reads %s as %i paise', (text, paise) => expect(rupeesToPaise(text)).toBe(paise));

  it.each(['', 'abc', '-5', '1.234', '1e3', '12.'])('refuses %j', (text) => expect(rupeesToPaise(text)).toBeNull());

  it('reads percents with up to 2 decimals', () => {
    expect(parsePercent('1.75')).toBe(1.75);
    expect(parsePercent('1.755')).toBeNull();
    expect(parsePercent('-1')).toBeNull();
  });
});

describe('validateRate', () => {
  const good = { carrier: 'ekart', zone: 'C', base: '43', extra: '25.80', codPercent: '1.75', codMinimum: '35' };

  it('returns paise and the percent', () => {
    expect(validateRate(good)).toEqual({
      ok: true,
      value: { carrier: 'ekart', zone: 'C', basePaise: 4_300, extraPer500gPaise: 2_580, codPercent: 1.75, codMinimumPaise: 3_500 },
    });
  });

  it('allows a zero COD minimum and the 10,000 and 10% limits', () => {
    expect(validateRate({ ...good, base: '10000', codPercent: '10', codMinimum: '0' }).ok).toBe(true);
  });

  it('rejects zero, over-limit and 3-decimal prices, and COD percents outside 0 to 10', () => {
    expect(validateRate({ ...good, base: '0', extra: '10000.01', codPercent: '10.5', codMinimum: '1.234' })).toEqual({
      ok: false,
      errors: { base: PRICE_MESSAGE, extra: PRICE_MESSAGE, codPercent: COD_PERCENT_MESSAGE, codMinimum: COD_MINIMUM_MESSAGE },
    });
    expect(validateRate({ ...good, codPercent: '1.755' }).ok).toBe(false);
  });

  it('rejects an unknown courier or zone', () => {
    expect(validateRate({ ...good, zone: 'F' })).toMatchObject({ ok: false, errors: { row: expect.any(String) } });
    expect(validateRate({ ...good, carrier: 'acme' }).ok).toBe(false);
  });
});

describe('validateOverride', () => {
  it('accepts a discount for one courier or all', () => {
    expect(validateOverride({ merchantId: 'mer_002', carrier: 'all', discount: '7.5', reason: ' Big  account ' })).toEqual({
      ok: true,
      value: { merchantId: 'mer_002', carrier: 'all', discountPercent: 7.5, reason: 'Big account' },
    });
  });

  it('reports every problem', () => {
    expect(validateOverride({ merchantId: '', carrier: 'acme', discount: '60', reason: 'no' })).toEqual({
      ok: false,
      errors: { merchant: 'Choose a merchant.', carrier: 'Choose a courier.', discount: DISCOUNT_MESSAGE, reason: REASON_MESSAGE },
    });
    expect(validateOverride({ merchantId: 'mer_002', carrier: 'all', discount: '0', reason: 'Big account' }).ok).toBe(false);
  });
});

describe('rate filters', () => {
  it('keeps known values and ignores the rest', () => {
    expect(parseRateFilters({ carrier: 'Ekart', zone: 'c' })).toEqual({ carrier: 'ekart', zone: 'C' });
    expect(parseRateFilters({ carrier: 'acme', zone: ['Z', 'A'] })).toEqual({ carrier: '', zone: '' });
    expect(parseRateFilters({})).toEqual({ carrier: '', zone: '' });
  });

  it('builds the URL without empty values', () => {
    expect(rateFiltersHref({ carrier: 'ekart', zone: '' })).toBe('/admin/pricing?carrier=ekart');
    expect(rateFiltersHref({ carrier: '', zone: '' })).toBe('/admin/pricing');
  });
});

describe('mock courier switch', () => {
  it('turns couriers off and on', async () => {
    const service = createMockAdminPricingService();
    expect(data(await service.setCourierEnabled('ekart', false)).enabled).toBe(false);
    expect(data(await service.setCourierEnabled('dhl', true)).enabled).toBe(true);
    expect(data(await service.listCouriers()).find((courier) => courier.carrier === 'ekart')!.enabled).toBe(false);
  });

  it('refuses to turn off the last courier, with a clear message', async () => {
    const service = createMockAdminPricingService();
    for (const carrier of ['delhivery', 'ekart', 'bluedart']) await service.setCourierEnabled(carrier, false);
    const last = await service.setCourierEnabled('shadowfax', false);
    expect(errorKind(last)).toBe('conflict');
    expect(last.ok ? '' : last.error.message).toContain('At least one courier must stay on');
    expect(data(await service.listCouriers()).filter((courier) => courier.enabled).map((courier) => courier.carrier)).toEqual(['shadowfax']);
    // Turning off an already-off courier is not "the last one".
    expect(errorKind(await service.setCourierEnabled('dhl', false))).toBeNull();
  });

  it('answers not_found for an unknown courier', async () => {
    expect(errorKind(await createMockAdminPricingService().setCourierEnabled('acme', true))).toBe('not_found');
  });
});

describe('mock updateRate', () => {
  const change = { carrier: 'ekart', zone: 'C' as const, basePaise: 4_500, extraPer500gPaise: 2_700, codPercent: 2, codMinimumPaise: 4_000 };

  it('returns before and after, and keeps the change', async () => {
    const service = createMockAdminPricingService();
    const { before, after } = data(await service.updateRate(change));
    expect(before.basePaise).toBe(4_300);
    expect(after).toEqual(change);
    expect(data(await service.listRateCard()).find((row) => row.carrier === 'ekart' && row.zone === 'C')).toEqual(change);
  });

  it.each([
    { basePaise: 0 },
    { extraPer500gPaise: 1_000_001 },
    { codPercent: 10.01 },
    { codPercent: 1.234 },
    { codMinimumPaise: -1 },
    { basePaise: 43.5 },
  ])('refuses %j and leaves the row alone', async (bad) => {
    const service = createMockAdminPricingService();
    expect(errorKind(await service.updateRate({ ...change, ...bad }))).toBe('validation');
    expect(data(await service.listRateCard()).find((row) => row.carrier === 'ekart' && row.zone === 'C')!.basePaise).toBe(4_300);
  });

  it('answers not_found for a row that does not exist', async () => {
    expect(errorKind(await createMockAdminPricingService().updateRate({ ...change, zone: 'F' as never }))).toBe('not_found');
  });
});

describe('mock overrides', () => {
  const input = { merchantId: 'mer_002', carrier: 'all', discountPercent: 6, reason: 'Big account' };

  it('adds and removes an override', async () => {
    const service = createMockAdminPricingService();
    const added = data(await service.addOverride(input));
    expect(added).toMatchObject({ id: 'ovr_003', merchantName: 'Neelgiri Teas', discountPercent: 6 });
    expect(data(await service.listOverrides())[0]!.id).toBe('ovr_003');
    expect(data(await service.removeOverride('ovr_003')).id).toBe('ovr_003');
    expect(data(await service.listOverrides()).some((entry) => entry.id === 'ovr_003')).toBe(false);
  });

  it('refuses a duplicate, an unknown merchant or courier, a bad discount, and an unknown id', async () => {
    const service = createMockAdminPricingService();
    expect(errorKind(await service.addOverride({ ...input, merchantId: 'mer_003' }))).toBe('conflict');
    expect(errorKind(await service.addOverride({ ...input, merchantId: 'mer_999' }))).toBe('not_found');
    expect(errorKind(await service.addOverride({ ...input, carrier: 'acme' }))).toBe('not_found');
    expect(errorKind(await service.addOverride({ ...input, discountPercent: 51 }))).toBe('validation');
    expect(errorKind(await service.removeOverride('ovr_999'))).toBe('not_found');
  });
});

describe('gateway pricing service', () => {
  it('says the changes are not available yet', async () => {
    expect(errorKind(await gatewayAdminPricingService.setCourierEnabled('ekart', false))).toBe('unavailable');
    expect(errorKind(await gatewayAdminPricingService.listOverrides())).toBe('unavailable');
  });
});
