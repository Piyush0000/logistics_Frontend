import { describe, expect, it } from 'vitest';
import { gatewayWalletService } from './gateway';
import { mockWalletService } from './mock';
import { parseRechargeRupees, validateRechargePaise } from './recharge';

describe('parseRechargeRupees', () => {
  it.each([
    ['100', 10000],
    ['1000', 100000],
    [' 2,500 ', 250000],
    ['500000', 50000000],
  ])('accepts %j', (text, paise) => {
    expect(parseRechargeRupees(text)).toEqual({ ok: true, paise });
  });

  it.each(['', 'abc', '12.5', '-100', '1e3', '99', '500001', '0'])('rejects %j', (text) => {
    expect(parseRechargeRupees(text).ok).toBe(false);
  });
});

describe('validateRechargePaise', () => {
  it('accepts whole rupees in range only', () => {
    expect(validateRechargePaise(10000)).toBe(true);
    expect(validateRechargePaise(50000000)).toBe(true);
    expect(validateRechargePaise(9900)).toBe(false);
    expect(validateRechargePaise(50000100)).toBe(false);
    expect(validateRechargePaise(10050)).toBe(false);
    expect(validateRechargePaise('10000')).toBe(false);
  });
});

describe('startRecharge', () => {
  it('takes no payment and changes no balance in the sample', async () => {
    const before = await mockWalletService.getBalance();
    const result = await mockWalletService.startRecharge(50000);
    const after = await mockWalletService.getBalance();

    expect(result).toEqual({ ok: true, source: 'mock', data: { paymentUrl: null } });
    expect(after).toEqual(before);
  });

  it('is unavailable through the gateway', async () => {
    expect(await gatewayWalletService.startRecharge(50000)).toMatchObject({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable' },
    });
  });
});
