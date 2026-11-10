/** Safe parsing of URL search parameters, so bad input falls back instead of crashing a page. */

/** A whole page number of 1 or more, else 1. */
export function parsePage(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** One of the `allowed` page sizes, else `fallback`. */
export function parseLimit(value: unknown, allowed: readonly number[], fallback: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const limit = Number(value);
  return allowed.includes(limit) ? limit : fallback;
}

/** The value when it is one of `allowed`, else undefined. */
export function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Trimmed text, cut to `max` characters. */
export function parseText(value: unknown, max = 100): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
