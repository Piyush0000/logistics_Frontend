import { afterEach, describe, expect, it } from 'vitest';
import { parseTab, resolveTab, visibleTabs } from './sections';

afterEach(() => {
  delete process.env.DATA_SOURCE_DEFAULT;
});

describe('parseTab', () => {
  it('opens every built tab and falls back to Overview for anything else', () => {
    for (const id of ['overview', 'pickups', 'ndr', 'rto', 'delivered', 'revenue', 'sms']) {
      expect(parseTab(id)).toBe(id);
    }
    for (const bad of [undefined, 'foo', '', ['sms', 'ndr'], 7]) expect(parseTab(bad)).toBe('overview');
  });

  it('on real data only, leaves out the tabs with no backend yet', () => {
    process.env.DATA_SOURCE_DEFAULT = 'gateway';
    expect(visibleTabs().map((tab) => tab.id)).toEqual(['overview', 'pickups', 'ndr', 'rto', 'delivered', 'revenue']);
    expect(parseTab('sms')).toBe('overview');
    expect(parseTab('rto')).toBe('rto');
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
