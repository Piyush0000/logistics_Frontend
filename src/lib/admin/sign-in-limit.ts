/**
 * Limits wrong admin passwords: after MAX_FAILURES from one address in WINDOW_MS, that address is
 * locked out until the window passes. In memory, which suits the single frontend server this runs
 * on; a restart clears it, which only ever makes it more lenient.
 */
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10_000;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const kept = (failures.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (kept.length) failures.set(key, kept);
  else failures.delete(key);
  return kept;
}

/** Minutes until this address may try again, or 0 when it may try now. */
export function lockedForMinutes(key: string, now = Date.now()): number {
  const kept = recent(key, now);
  if (kept.length < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((kept[0]! + WINDOW_MS - now) / 60_000));
}

export function recordFailure(key: string, now = Date.now()): void {
  if (failures.size >= MAX_TRACKED && !failures.has(key)) {
    // Bounded: drop the oldest address rather than grow without limit.
    const oldest = failures.keys().next().value;
    if (oldest !== undefined) failures.delete(oldest);
  }
  failures.set(key, [...recent(key, now), now]);
}

export function clearFailures(key: string): void {
  failures.delete(key);
}

/**
 * The caller's address. X-Real-IP first: nginx sets it from the connection itself. The first entry
 * of X-Forwarded-For is whatever the caller sent, so it is only a fallback, and then its last hop.
 */
export function clientKey(forwardedFor: string | null, realIp: string | null): string {
  return realIp?.trim() || forwardedFor?.split(',').at(-1)?.trim() || 'unknown';
}
