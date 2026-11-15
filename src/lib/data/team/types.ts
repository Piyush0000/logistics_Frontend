import type { DataResult } from '../source';

export const ROLES = ['admin', 'operations', 'finance', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  operations: 'Operations',
  finance: 'Finance',
  viewer: 'Viewer',
};

/** What each role can see and do. */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Can see and do everything, including managing the team and settings.',
  operations: 'Can create and track shipments, and handle pickups, NDR and returns. Cannot see billing.',
  finance: 'Can see the wallet, COD remittance, invoices and weight charges. Cannot create shipments.',
  viewer: 'Can look at shipments and reports. Cannot change anything.',
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: 'active' | 'invited';
}

export interface TeamService {
  listMembers(): Promise<DataResult<TeamMember[]>>;
  invite(email: string, role: Role): Promise<DataResult<TeamMember>>;
  changeRole(id: string, role: Role): Promise<DataResult<TeamMember>>;
  remove(id: string): Promise<DataResult<null>>;
}

/** Shown when the last admin would be removed or demoted. */
export const LAST_ADMIN_MESSAGE = 'At least one admin must remain. Make someone else an admin first.';
