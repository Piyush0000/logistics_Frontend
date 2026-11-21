import type { Role } from '../data/team/types';

/**
 * Which screens each role uses. The gateway enforces the same rules on every request; this only
 * keeps the menu to what a person can use. Paths not listed are open to every role.
 */
const RULES: [prefix: string, roles: readonly Role[]][] = [
  ['/orders/create', ['admin', 'operations']],
  ['/orders/bulk', ['admin', 'operations']],
  ['/orders/b2b', ['admin', 'operations']],
  ['/orders/pickups', ['admin', 'operations']],
  ['/finances', ['admin', 'finance']],
  ['/reconciliation', ['admin', 'finance']],
  ['/settings/company', ['admin', 'finance']],
  ['/settings/users', ['admin']],
  ['/settings/notifications', ['admin']],
  ['/settings/tracking-page', ['admin']],
  ['/settings/courier-rules', ['admin', 'operations']],
  ['/settings/sub-merchants', ['admin']],
  ['/channel-integrations', ['admin']],
];

export function canOpen(role: Role, path: string): boolean {
  const rule = RULES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return !rule || rule[1].includes(role);
}

/** Identity's stored role to the app's: OWNER and ADMIN are admin, MEMBER is operations. */
export function roleFromIdentity(kind: string | null | undefined, role: string | null | undefined): Role {
  if (kind === 'api_key') return 'admin';
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'admin';
    case 'FINANCE':
      return 'finance';
    case 'VIEWER':
      return 'viewer';
    case 'OPERATIONS':
    case 'MEMBER':
      return 'operations';
    default:
      // Sample-data sign-in has no role: it sees everything, as before.
      return 'admin';
  }
}
