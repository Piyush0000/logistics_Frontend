import { describe, expect, it } from 'vitest';
import { ndrReasonCounts } from './reasons';

const r = (reason: string) => ({ reason });

describe('ndrReasonCounts', () => {
  it('counts records by reason, most common first, ties in first-seen order', () => {
    const data = ndrReasonCounts([r('Door locked'), r('Refused'), r('Door locked'), r('Wrong address')]);
    expect(data.map((d) => d.value)).toEqual([2, 1, 1]);
    expect(data.map((d) => d.fullLabel)).toEqual(['Door locked', 'Refused', 'Wrong address']);
  });

  it('shortens long reasons for the axis but keeps the full text', () => {
    const [first] = ndrReasonCounts([r('Customer refused delivery (COD amount mismatch)')]);
    expect(first!.label.length).toBeLessThanOrEqual(12);
    expect(first!.label.endsWith('…')).toBe(true);
    expect(first!.fullLabel).toBe('Customer refused delivery (COD amount mismatch)');
  });

  it('gives the sample reasons distinct short labels', () => {
    const labels = ndrReasonCounts(
      [
        'Customer requested future delivery date',
        'Door locked / Premise closed',
        'Incorrect / Incomplete delivery address',
        'Customer refused delivery (COD amount mismatch)',
      ].map(r),
    ).map((d) => d.label);
    expect(labels).toEqual(['Requested…', 'Door locked', 'Incorrect', 'Refused…']);
  });

  it('groups everything after the top five as Other', () => {
    const records = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'a'].map(r);
    const data = ndrReasonCounts(records);
    expect(data).toHaveLength(6);
    expect(data[0]).toMatchObject({ fullLabel: 'a', value: 2 });
    expect(data[5]).toMatchObject({ label: 'Other', value: 2 });
  });

  it('trims blanks and names a missing reason', () => {
    const data = ndrReasonCounts([r('  '), r(' Door locked '), r('Door locked')]);
    expect(data.find((d) => d.fullLabel === 'Door locked')?.value).toBe(2);
    expect(data.find((d) => d.fullLabel === 'No reason given')?.value).toBe(1);
  });

  it('returns nothing for no records', () => {
    expect(ndrReasonCounts([])).toEqual([]);
  });
});
