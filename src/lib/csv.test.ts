import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('keeps a plain negative number as a number', () => {
    expect(csvCell('-12.00')).toBe('-12.00');
    expect(csvCell('12.50')).toBe('12.50');
  });

  it('guards values that could run as formulas', () => {
    expect(csvCell('=cmd()')).toBe("'=cmd()");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('-1+2')).toBe("'-1+2");
    expect(csvCell('+91 98765 43210')).toBe("'+91 98765 43210");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tx')).toBe("'\tx");
  });
});

describe('toCsv trailer', () => {
  it('ends with the trailer line when given', () => {
    expect(toCsv(['A'], [['1']], undefined, '# end')).toBe('A\r\n1\r\n# end\r\n');
  });
});
