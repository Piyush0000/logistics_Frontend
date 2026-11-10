/** CSV building for downloads: safe cells, CRLF lines and an optional first-line notice. */

/** Rupees to two places, worked out in whole numbers so nothing is rounded. */
export function csvRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const whole = Math.abs(paise);
  return `${sign}${Math.trunc(whole / 100)}.${String(whole % 100).padStart(2, '0')}`;
}

/** A money amount such as -12.00 cannot run as a formula, so it stays numeric. A bare "-1" stays guarded. */
const PLAIN_NUMBER = /^-?\d+\.\d{2}$/;

export function csvCell(value: string): string {
  // Spreadsheets run cells starting with these as formulas, so a leading quote keeps them as text.
  const safe = !PLAIN_NUMBER.test(value) && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * One CSV document. `notice`, when given, is the first line, ahead of the header, for example
 * to mark sample data.
 */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly string[])[],
  notice?: string,
  trailer?: string,
): string {
  const lines = [
    ...(notice ? [notice] : []),
    header.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
    ...(trailer ? [trailer] : []),
  ];
  return `${lines.join('\r\n')}\r\n`;
}
