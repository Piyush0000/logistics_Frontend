import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { activeGroupLabel, isActivePath, NAV } from './nav-config';

const APP_DIR = join(process.cwd(), 'src', 'app');

function liveHrefs(): string[] {
  return NAV.flatMap((group) => [
    ...(group.href && group.status === 'live' ? [group.href] : []),
    ...(group.children ?? []).filter((item) => item.status === 'live').map((item) => item.href),
  ]);
}

function hasPage(href: string): boolean {
  const folder = href.replace(/^\//, '');
  return ['(app)', '(public)'].some((group) =>
    existsSync(join(APP_DIR, group, folder, 'page.tsx')),
  );
}

describe('NAV', () => {
  it('every live link points at an existing page', () => {
    const hrefs = liveHrefs();

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(hasPage(href), `${href} has no page.tsx`).toBe(true);
    }
  });

  it('lists the groups in menu order', () => {
    expect(NAV.map((group) => group.label)).toEqual([
      'Home',
      'Dashboard',
      'Shipping Management',
      'Operations',
      'Billings',
      'Reconciliation',
      'Tools',
      'Reports',
      'Settings',
      'Help & Support',
    ]);
  });
});

describe('isActivePath', () => {
  it('matches the exact page and pages below it', () => {
    expect(isActivePath('/ndr', '/ndr')).toBe(true);
    expect(isActivePath('/orders', '/orders/DEMOEK001')).toBe(true);
    expect(isActivePath('/ndr', '/ndrx')).toBe(false);
  });

  it('keeps Create Shipment separate from All Shipments', () => {
    expect(isActivePath('/orders', '/orders/create')).toBe(false);
    expect(isActivePath('/orders/create', '/orders/create')).toBe(true);
  });
});

describe('B2C Shipments', () => {
  it('is live and does not make All Shipments current', () => {
    const group = NAV.find((entry) => entry.label === 'Shipping Management');
    const b2c = group?.children?.find((item) => item.label === 'B2C Shipments');
    expect(b2c?.status).toBe('live');
    expect(isActivePath('/orders/b2c', '/orders/b2c')).toBe(true);
    expect(isActivePath('/orders', '/orders/b2c')).toBe(false);
  });
});

describe('activeGroupLabel', () => {
  it('marks All Shipments active for an order detail page', () => {
    expect(activeGroupLabel('/orders/DEMOEK001')).toBe('Shipping Management');
  });

  it('marks Settings active on Channel Integrations', () => {
    expect(activeGroupLabel('/channel-integrations')).toBe('Settings');
  });

  it('finds the group of a child page and of a single link', () => {
    expect(activeGroupLabel('/finances/wallet')).toBe('Billings');
    expect(activeGroupLabel('/dashboard')).toBe('Dashboard');
  });

  it('returns null outside the menu', () => {
    expect(activeGroupLabel('/login')).toBeNull();
  });
});
