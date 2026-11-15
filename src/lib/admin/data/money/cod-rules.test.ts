import { describe, expect, it } from 'vitest';
import {
  BANK_CREDIT_RANGE_MESSAGE,
  daysPastDue,
  MAX_BANK_CREDIT_PAISE,
  NOTE_MESSAGE,
  parseBankCredit,
  parseUtr,
  payoutDays,
  payoutDueDate,
  RESOLUTION_MESSAGE,
  UTR_MESSAGE,
  validateResolution,
} from './cod-rules';
import { AMOUNT_FORMAT_MESSAGE } from './wallet-adjustment';

describe('payout dates', () => {
  it('uses the reconciliation service payout days, 7 for couriers it does not list', () => {
    expect([payoutDays('delhivery'), payoutDays('Ekart'), payoutDays('shadowfax'), payoutDays('bluedart')]).toEqual([7, 7, 5, 7]);
  });

  it('adds the payout days to the last delivery day, across a month end', () => {
    expect(payoutDueDate('shadowfax', '2026-10-29')).toBe('2026-11-03');
    expect(payoutDueDate('delhivery', '2026-12-28')).toBe('2027-01-04');
  });

  it('counts whole days past the due date', () => {
    expect(daysPastDue('2026-11-10', '2026-11-15')).toBe(5);
    expect(daysPastDue('2026-11-15', '2026-11-15')).toBe(0);
    expect(daysPastDue('2026-11-20', '2026-11-15')).toBe(-5);
  });
});

describe('parseBankCredit', () => {
  it('reads rupees as paise up to ₹1 crore', () => {
    expect(parseBankCredit('1,84,500')).toEqual({ ok: true, paise: 18_450_000 });
    expect(parseBankCredit('10000000')).toEqual({ ok: true, paise: MAX_BANK_CREDIT_PAISE });
  });

  it.each(['0', '-1', '10000000.01', '1.005'])('rejects %s as out of range', (text) => {
    expect(parseBankCredit(text)).toEqual({ ok: false, message: BANK_CREDIT_RANGE_MESSAGE });
  });

  it('rejects text that is not an amount', () => {
    expect(parseBankCredit('lots')).toEqual({ ok: false, message: AMOUNT_FORMAT_MESSAGE });
  });
});

describe('parseUtr', () => {
  it('treats empty as no UTR and upper-cases the rest', () => {
    expect(parseUtr('  ')).toEqual({ ok: true, utr: null });
    expect(parseUtr(' utib0011020045 ')).toEqual({ ok: true, utr: 'UTIB0011020045' });
  });

  it.each(['ABC12', 'UTR-123456', 'x'.repeat(31), 'UTR 123456'])('rejects %s', (text) => {
    expect(parseUtr(text)).toEqual({ ok: false, message: UTR_MESSAGE });
  });
});

describe('validateResolution', () => {
  it('accepts resolved or written off with a tidied reason', () => {
    expect(validateResolution({ resolution: 'written_off', note: '  Customer   refunded  ' })).toEqual({
      ok: true,
      value: { resolution: 'written_off', note: 'Customer refunded' },
    });
  });

  it('reports a bad type and a short reason together', () => {
    expect(validateResolution({ resolution: 'ignored', note: 'ok' })).toEqual({
      ok: false,
      errors: { resolution: RESOLUTION_MESSAGE, note: NOTE_MESSAGE },
    });
  });
});
