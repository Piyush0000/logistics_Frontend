import { describe, expect, it } from 'vitest';
import { parseEnum, parseLimit, parsePage, parseText } from './url-params';

describe('parsePage', () => {
  it('accepts whole numbers of 1 or more and falls back to 1', () => {
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('-1')).toBe(1);
    expect(parsePage('2.5')).toBe(1);
    expect(parsePage('0')).toBe(1);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage(['2', '3'])).toBe(1);
    expect(parsePage('3')).toBe(3);
  });
});

describe('parseLimit', () => {
  it('accepts only the allowed sizes', () => {
    expect(parseLimit('25', [10, 25, 50], 10)).toBe(25);
    expect(parseLimit('30', [10, 25, 50], 10)).toBe(10);
    expect(parseLimit('abc', [10, 25, 50], 10)).toBe(10);
    expect(parseLimit(undefined, [10, 25, 50], 10)).toBe(10);
  });
});

describe('parseEnum', () => {
  it('returns the value only when it is allowed', () => {
    expect(parseEnum('FOO', ['A'])).toBeUndefined();
    expect(parseEnum('A', ['A', 'B'])).toBe('A');
    expect(parseEnum(undefined, ['A'])).toBeUndefined();
  });
});

describe('parseText', () => {
  it('trims and cuts long text', () => {
    expect(parseText('x'.repeat(300))).toHaveLength(100);
    expect(parseText('  hello  ')).toBe('hello');
    expect(parseText('abcdef', 3)).toBe('abc');
    expect(parseText(undefined)).toBe('');
    expect(parseText(['a'])).toBe('');
  });
});
