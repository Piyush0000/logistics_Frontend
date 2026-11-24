import { describe, expect, it } from 'vitest';
import { clearFailures, clientKey, lockedForMinutes, MAX_FAILURES, recordFailure, WINDOW_MS } from './sign-in-limit';

describe('admin sign-in limit', () => {
  it('locks an address after five wrong passwords, for the rest of the window', () => {
    const key = 'test-lock';
    const start = 1_000_000;
    for (let i = 0; i < MAX_FAILURES - 1; i += 1) recordFailure(key, start + i);
    expect(lockedForMinutes(key, start + 10)).toBe(0);
    recordFailure(key, start + 10);
    expect(lockedForMinutes(key, start + 11)).toBe(15);
    // Unlocked once the first failure is older than the window.
    expect(lockedForMinutes(key, start + WINDOW_MS + 5)).toBe(0);
  });

  it('forgets failures after a successful sign-in, and keeps addresses apart', () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) recordFailure('a', 2_000_000 + i);
    expect(lockedForMinutes('b', 2_000_010)).toBe(0);
    clearFailures('a');
    expect(lockedForMinutes('a', 2_000_010)).toBe(0);
  });

  it('trusts the address nginx saw, not one the caller wrote', () => {
    expect(clientKey('6.6.6.6, 203.0.113.7', '203.0.113.7')).toBe('203.0.113.7');
    expect(clientKey('6.6.6.6, 203.0.113.7', null)).toBe('203.0.113.7');
    expect(clientKey(null, '198.51.100.2')).toBe('198.51.100.2');
    expect(clientKey(null, null)).toBe('unknown');
  });
});
