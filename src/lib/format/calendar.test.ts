import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  formatIsoDay,
  isValidIsoDay,
  monthCells,
  monthLabel,
  monthOf,
} from './calendar';

describe('isValidIsoDay', () => {
  it('accepts real days only', () => {
    expect(isValidIsoDay('2026-02-28')).toBe(true);
    expect(isValidIsoDay('2028-02-29')).toBe(true);
    expect(isValidIsoDay('2026-02-29')).toBe(false);
    expect(isValidIsoDay('2026-13-01')).toBe(false);
    expect(isValidIsoDay('1/2/2026')).toBe(false);
    expect(isValidIsoDay('')).toBe(false);
  });
});

describe('monthCells', () => {
  it('starts on the right weekday, with Sunday first', () => {
    // 1 November 2026 is a Sunday.
    expect(monthCells({ year: 2026, month: 10 })[0]).toBe('2026-11-01');
    // 1 October 2026 is a Thursday.
    expect(monthCells({ year: 2026, month: 9 }).slice(0, 5)).toEqual([
      null,
      null,
      null,
      null,
      '2026-10-01',
    ]);
  });

  it('covers every day of the month', () => {
    const days = monthCells({ year: 2028, month: 1 }).filter(Boolean);

    expect(days).toHaveLength(29);
    expect(days.at(-1)).toBe('2028-02-29');
  });
});

describe('addMonths', () => {
  it('crosses years in both directions', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-05', 7)).toBe('2026-10-12');
  });
});

describe('labels', () => {
  it('names a month', () => {
    expect(monthLabel({ year: 2026, month: 10 })).toBe('November 2026');
  });

  it('reads the month from a day', () => {
    expect(monthOf('2026-11-06')).toEqual({ year: 2026, month: 10 });
  });

  it('shows a day the Indian way round', () => {
    expect(formatIsoDay('2026-11-06')).toBe('06/11/2026');
  });
});
