import { describe, expect, it } from 'vitest';
import {
  AMOUNT_FORMAT_MESSAGE,
  AMOUNT_RANGE_MESSAGE,
  balanceAfter,
  cleanReason,
  DIRECTION_MESSAGE,
  isAllowedAmount,
  MAX_ADJUSTMENT_PAISE,
  parseRupeesToPaise,
  REASON_MESSAGE,
  validateAdjustment,
} from './wallet-adjustment';

describe('parseRupeesToPaise', () => {
  it.each([
    ['1', 100],
    ['1250', 125_000],
    ['1250.5', 125_050],
    ['1250.50', 125_050],
    ['0.01', 1],
    ['0.29', 29],
    ['1,250.75', 125_075],
    ['  99.99  ', 9_999],
    ['500000', MAX_ADJUSTMENT_PAISE],
  ])('reads %s as %i paise', (text, paise) => {
    expect(parseRupeesToPaise(text)).toEqual({ ok: true, paise });
  });

  it.each(['0', '0.00', '-50', '-0.5', '500000.01', '1000000', '1.234', '0.001'])('rejects %s as out of range', (text) => {
    expect(parseRupeesToPaise(text)).toEqual({ ok: false, message: AMOUNT_RANGE_MESSAGE });
  });

  it.each(['', '  ', 'abc', '1e5', '₹100', '12.', '.5', '1 000', '1.2.3', 'Infinity', 'NaN'])('rejects %j as not an amount', (text) => {
    expect(parseRupeesToPaise(text)).toEqual({ ok: false, message: AMOUNT_FORMAT_MESSAGE });
  });

  it('rejects absurdly long numbers instead of losing precision', () => {
    expect(parseRupeesToPaise('12345678901234567890').ok).toBe(false);
  });
});

describe('isAllowedAmount', () => {
  it('accepts whole paise from 1 up to the limit', () => {
    expect(isAllowedAmount(1)).toBe(true);
    expect(isAllowedAmount(MAX_ADJUSTMENT_PAISE)).toBe(true);
  });

  it.each([0, -1, MAX_ADJUSTMENT_PAISE + 1, 1.5, Number.NaN, Infinity, '100', null])('refuses %j', (value) => {
    expect(isAllowedAmount(value)).toBe(false);
  });
});

describe('cleanReason', () => {
  it('collapses spaces and line breaks', () => {
    expect(cleanReason('  Lost   parcel\n\nrefund  ')).toBe('Lost parcel refund');
  });
});

describe('validateAdjustment', () => {
  const good = { merchantId: 'mer_001', amount: '1,200', direction: 'credit', reason: 'Goodwill credit for a lost parcel' };

  it('returns the cleaned adjustment in paise', () => {
    expect(validateAdjustment({ ...good, reason: ' Goodwill  credit ' })).toEqual({
      ok: true,
      value: { merchantId: 'mer_001', amountPaise: 120_000, direction: 'credit', reason: 'Goodwill credit' },
    });
  });

  it('reports every problem at once', () => {
    expect(validateAdjustment({ merchantId: 'mer_001', amount: '1.234', direction: 'refund', reason: 'ok' })).toEqual({
      ok: false,
      errors: { amount: AMOUNT_RANGE_MESSAGE, direction: DIRECTION_MESSAGE, reason: REASON_MESSAGE },
    });
  });

  it('counts the reason after tidying spaces, from 5 to 300 characters', () => {
    expect(validateAdjustment({ ...good, reason: '  a   b  ' }).ok).toBe(false);
    expect(validateAdjustment({ ...good, reason: 'abcde' }).ok).toBe(true);
    expect(validateAdjustment({ ...good, reason: 'x'.repeat(300) }).ok).toBe(true);
    expect(validateAdjustment({ ...good, reason: 'x'.repeat(301) }).ok).toBe(false);
  });
});

describe('balanceAfter', () => {
  it('adds a credit and takes away a debit, even below zero', () => {
    expect(balanceAfter(10_000, { amountPaise: 2_500, direction: 'credit' })).toBe(12_500);
    expect(balanceAfter(10_000, { amountPaise: 12_500, direction: 'debit' })).toBe(-2_500);
  });
});
