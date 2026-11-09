/** Calendar days as YYYY-MM-DD. UTC is used for the arithmetic only, so no day shifts by time zone. */

export interface CalendarMonth {
  year: number;
  /** 0 for January, as in Date. */
  month: number;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const toIso = (date: Date) => date.toISOString().slice(0, 10);
const fromIso = (day: string) => new Date(`${day}T00:00:00Z`);

export function isValidIsoDay(day: string): boolean {
  if (!ISO_DAY.test(day)) return false;
  const date = fromIso(day);
  return !Number.isNaN(date.getTime()) && toIso(date) === day;
}

export function monthOf(day: string): CalendarMonth {
  const date = fromIso(day);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function addMonths({ year, month }: CalendarMonth, count: number): CalendarMonth {
  const date = new Date(Date.UTC(year, month + count, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function addDays(day: string, count: number): string {
  const date = fromIso(day);
  date.setUTCDate(date.getUTCDate() + count);
  return toIso(date);
}

/** A month's days for a Sunday-first grid, with null for the blanks before the 1st. */
export function monthCells({ year, month }: CalendarMonth): (string | null)[] {
  const blanks = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length }, (_, index) => toIso(new Date(Date.UTC(year, month, index + 1)))),
  ];
}

export function monthLabel({ year, month }: CalendarMonth): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function formatIsoDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}
