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
