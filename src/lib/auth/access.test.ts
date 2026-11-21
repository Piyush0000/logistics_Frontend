import { describe, expect, it } from 'vitest';
import { visibleNav } from '@/components/shell/nav-config';
import { canOpen, roleFromIdentity } from './access';

const hrefs = (groups: ReturnType<typeof visibleNav>) =>
  groups.flatMap((g) => [g.href, ...(g.children ?? []).map((c) => c.href)]).filter(Boolean);

describe('access by role', () => {
  it('maps identity roles; an API key and sample sign-in see everything', () => {
    expect(roleFromIdentity('session', 'OWNER')).toBe('admin');
    expect(roleFromIdentity('session', 'MEMBER')).toBe('operations');
    expect(roleFromIdentity('session', 'FINANCE')).toBe('finance');
    expect(roleFromIdentity('session', 'VIEWER')).toBe('viewer');
    expect(roleFromIdentity('api_key', null)).toBe('admin');
    expect(roleFromIdentity(undefined, undefined)).toBe('admin');
  });

  it('keeps billing from operations and booking from finance', () => {
    expect(canOpen('operations', '/orders/create')).toBe(true);
    expect(canOpen('operations', '/finances/cod')).toBe(false);
    expect(canOpen('finance', '/finances/cod')).toBe(true);
    expect(canOpen('finance', '/orders/create')).toBe(false);
    expect(canOpen('viewer', '/orders')).toBe(true);
    expect(canOpen('viewer', '/settings/users')).toBe(false);
    expect(canOpen('admin', '/settings/users')).toBe(true);
  });

  it('shows each role only its own menu', () => {
    const finance = hrefs(visibleNav(false, undefined, 'finance'));
    expect(finance).toContain('/finances/wallet');
    expect(finance).not.toContain('/orders/create');
    const viewer = hrefs(visibleNav(false, undefined, 'viewer'));
    expect(viewer).toContain('/orders');
    expect(viewer).not.toContain('/finances/cod');
    expect(viewer).not.toContain('/orders/create');
  });
});
