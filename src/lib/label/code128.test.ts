import { describe, expect, it } from 'vitest';
import { CODE128_PATTERNS, code128Values, code128Widths } from './code128';

describe('Code 128 table', () => {
  it('has 107 distinct symbols of 11 modules, and a 13-module stop', () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((pattern, value) => {
      const modules = [...pattern].reduce((sum, w) => sum + Number(w), 0);
      expect(modules, `symbol ${value}`).toBe(value === 106 ? 13 : 11);
    });
  });
});

describe('code128Values', () => {
  it('encodes PJJ123C in set B with the weighted check symbol', () => {
    // A run of three digits is too short for set C. The check symbol is the start value plus each
    // symbol times its position: 104 + 1×48 + 2×42 + 3×42 + 4×17 + 5×18 + 6×19 + 7×35 = 879, mod 103.
    const values = code128Values('PJJ123C');
    expect(values.slice(0, 8)).toEqual([104, 48, 42, 42, 17, 18, 19, 35]);
    expect(values.at(-2)).toBe(879 % 103);
    expect(values.at(-1)).toBe(106);
  });

  it('packs a digits-only courier AWB two digits per symbol in set C', () => {
    expect(code128Values('71705910000055')).toEqual([105, 71, 70, 59, 10, 0, 0, 55, expect.any(Number), 106]);
  });

  it('switches to set C for the digits of an Evoc AWB', () => {
    const values = code128Values('EVS8516979039');
    expect(values.slice(0, 5)).toEqual([104, 37, 54, 51, 99]);
    expect(values.slice(5, 10)).toEqual([85, 16, 97, 90, 39]);
  });

  it('refuses what a barcode cannot carry', () => {
    expect(() => code128Values('')).toThrow();
    expect(() => code128Values('AWB₹')).toThrow(/Cannot encode/);
  });

  it('draws whole symbols: 11 modules each, plus the stop', () => {
    const widths = code128Widths('EVS8516979039');
    const symbols = code128Values('EVS8516979039').length;
    expect(widths.reduce((a, b) => a + b, 0)).toBe((symbols - 1) * 11 + 13);
  });
});
