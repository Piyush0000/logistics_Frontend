const DAY_MS = 24 * 60 * 60 * 1000;

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replaceAll('/', '.');
}

/** The seven days ending on the given date, in Indian time. */
export function formatDateRange(end: Date): string {
  return `${formatDay(new Date(end.getTime() - 7 * DAY_MS))} - ${formatDay(end)}`;
}

/** A moment in Indian time, for example 30/7/2026, 11:20:33 pm. */
export function formatDateTime(moment: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(moment));
}

/** A date in Indian time, for example 20 Jul 2026. */
export function formatDate(moment: string): string {
  // en-US, because en-GB and en-IN shorten September to Sept.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date(moment));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  return `${part('day')} ${part('month')} ${part('year')}`;
}

/** The calendar day in India as YYYY-MM-DD, which can differ from the UTC day. */
export function indianDay(moment: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(moment));
}
