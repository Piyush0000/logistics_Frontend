import { describe, expect, it } from 'vitest';
import { parseTab, resolveTab } from './sections';

describe('parseTab', () => {
  it('opens every built tab and falls back to Overview for anything else', () => {
    for (const id of ['overview', 'pickups', 'ndr', 'rto', 'delivered', 'revenue', 'sms']) {
      expect(parseTab(id)).toBe(id);
    }
    for (const bad of [undefined, 'foo', '', ['sms', 'ndr'], 7]) expect(parseTab(bad)).toBe('overview');
  });
});

describe('resolveTab', () => {
  const tabs = [
    { id: 'overview', enabled: true },
    { id: 'ndr', enabled: true },
    { id: 'sms', enabled: false },
  ] as const;

  it('falls back to Overview for a known tab that is not enabled', () => {
    expect(resolveTab('sms', tabs)).toBe('overview');
    expect(resolveTab('ndr', tabs)).toBe('ndr');
    expect(resolveTab('rto', tabs)).toBe('overview');
  });
});
