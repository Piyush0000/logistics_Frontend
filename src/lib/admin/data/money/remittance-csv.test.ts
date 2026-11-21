import { describe, expect, it } from 'vitest';
import { parseRemittanceCsv } from './cod-rules';

describe('parseRemittanceCsv', () => {
  it("reads the AWB and amount columns of a courier's own export", () => {
    const csv = '\uFEFFWaybill,Order ID,"COD Amount",Remarks\r\n71705910000055,ORD-1,"1,249.00",ok\r\n71705910000062,ORD-2,998,\r\n\r\n';
    expect(parseRemittanceCsv(csv)).toEqual({
      ok: true,
      lines: [
        { awb: '71705910000055', amountPaise: 124_900 },
        { awb: '71705910000062', amountPaise: 99_800 },
      ],
    });
  });

  it('says which row is wrong', () => {
    expect(parseRemittanceCsv('awb,amount\nA1234,abc')).toEqual({ ok: false, message: 'Row 2: the amount is not a rupee amount.' });
    expect(parseRemittanceCsv('awb,amount\n,10')).toMatchObject({ ok: false, message: 'Row 2: the AWB is missing or invalid.' });
  });

  it('needs a header with both columns and at least one row', () => {
    expect(parseRemittanceCsv('awb,amount')).toMatchObject({ ok: false });
    expect(parseRemittanceCsv('id,value\n1,2')).toMatchObject({ ok: false, message: 'The header must have an AWB column and an amount column.' });
  });
});
