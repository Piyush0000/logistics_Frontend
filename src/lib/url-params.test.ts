import { describe, expect, it } from 'vitest';
import { buildPageHref, parseEnum, parseLimit, parsePage, parseText } from './url-params';

describe('parsePage', () => {
  it('accepts whole numbers of 1 or more and falls back to 1', () => {
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('-1')).toBe(1);
    expect(parsePage('2.5')).toBe(1);
    expect(parsePage('0')).toBe(1);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage(['2', '3'])).toBe(1);
    expect(parsePage('3')).toBe(3);
    expect(parsePage('10000')).toBe(10000);
    // Above the backend's cap of 10,000, so it falls back to 1 instead of drawing a 400.
    expect(parsePage('10001')).toBe(1);
    expect(parsePage('99999999999')).toBe(1);
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

describe('buildPageHref', () => {
  it('drops the page parameter for page 1', () => {
    expect(buildPageHref('/orders', { status: 'DELIVERED' }, 1)).toBe('/orders?status=DELIVERED');
    expect(buildPageHref('/orders', {}, 1)).toBe('/orders');
  });

  it('sets the page parameter above page 1', () => {
    expect(buildPageHref('/orders/b2b', {}, 3)).toBe('/orders/b2b?page=3');
  });

  it('drops empty and missing values and keeps the others in order', () => {
    const params = { status: 'IN_TRANSIT', carrier: '', search: undefined, q: 'a b' };
    expect(buildPageHref('/orders/b2c', params, 2)).toBe('/orders/b2c?status=IN_TRANSIT&q=a+b&page=2');
  });

  it('ignores a page value already in the params', () => {
    expect(buildPageHref('/x', { page: '5', search: 'a' }, 2)).toBe('/x?search=a&page=2');
  });
});
