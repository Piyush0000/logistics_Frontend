import { describe, expect, it } from 'vitest';
import { rtoByCourier } from './courier';

const s = (carrier: string) => ({ carrier });

describe('rtoByCourier', () => {
  it('counts shipments per courier with display names, most first', () => {
    const data = rtoByCourier([s('ekart'), s('bluedart'), s('ekart'), s('delhivery'), s('ekart'), s('bluedart')]);
    expect(data).toEqual([
      { label: 'Ekart', value: 3 },
      { label: 'Blue Dart', value: 2 },
      { label: 'Delhivery', value: 1 },
    ]);
  });

  it('merges carriers that differ only in case', () => {
    expect(rtoByCourier([s('EKART'), s('ekart')])).toEqual([{ label: 'Ekart', value: 2 }]);
  });

  it('returns nothing for no shipments', () => {
    expect(rtoByCourier([])).toEqual([]);
  });
});
