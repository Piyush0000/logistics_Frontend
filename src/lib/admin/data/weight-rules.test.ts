import { describe, expect, it } from 'vitest';
import { parseWeightCsv, validateResolutionNote } from './weight-rules';

const csv = (...rows: string[]) => rows.join('\n');

describe('parseWeightCsv', () => {
  it('reads kilograms, grams, quoted rupees and a byte-order mark', () => {
    expect(parseWeightCsv('﻿' + csv('Waybill,Charged Weight (kg),Extra Charge', '1234567890,1.25,"1,045.50"', ''))).toEqual({
      ok: true,
      lines: [{ awb: '1234567890', chargedGrams: 1250, extraChargePaise: 104_550 }],
    });
    expect(parseWeightCsv(csv('AWB,Declared weight,Charged weight (grams),Excess amount', 'SF123456,500,1800,Rs 62'))).toEqual({
      ok: true,
      lines: [{ awb: 'SF123456', chargedGrams: 1800, extraChargePaise: 6_200 }],
    });
  });

  it('says which row is wrong', () => {
    expect(parseWeightCsv(csv('AWB,Weight,Charge', 'ABCD1234,heavy,10'))).toEqual({
      ok: false,
      message: 'Row 2: the charged weight is not a number.',
    });
    expect(parseWeightCsv(csv('AWB,Charge', 'ABCD1234,10'))).toMatchObject({ ok: false });
    expect(parseWeightCsv('AWB,Weight,Charge')).toMatchObject({ ok: false });
  });
});

describe('validateResolutionNote', () => {
  it('needs a few words and at most 500 characters', () => {
    expect(validateResolutionNote('ok')).not.toBeNull();
    expect(validateResolutionNote('Scan photo shows 1.4 kg')).toBeNull();
    expect(validateResolutionNote('x'.repeat(501))).not.toBeNull();
  });
});
