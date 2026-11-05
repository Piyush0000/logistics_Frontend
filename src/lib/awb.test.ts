import { describe, expect, it } from 'vitest';
import { MAX_AWBS, parseAwbQuery } from './awb';

describe('parseAwbQuery', () => {
  it('splits on commas and trims spaces', () => {
    expect(parseAwbQuery(' A1, B2 ,C3 ').awbs).toEqual(['A1', 'B2', 'C3']);
  });

  it('accepts spaces and new lines as separators', () => {
    expect(parseAwbQuery('A1 B2\nC3').awbs).toEqual(['A1', 'B2', 'C3']);
  });

  it('removes duplicates and empty entries', () => {
    expect(parseAwbQuery('A1,,A1, ,B2').awbs).toEqual(['A1', 'B2']);
  });

  it('returns nothing for blank input', () => {
    expect(parseAwbQuery('  ,  ').awbs).toEqual([]);
  });

  it('caps a long list and says so', () => {
    const list = Array.from({ length: MAX_AWBS + 3 }, (_, index) => `A${index}`).join(',');

    const result = parseAwbQuery(list);

    expect(result.awbs).toHaveLength(MAX_AWBS);
    expect(result.truncated).toBe(true);
  });
});
