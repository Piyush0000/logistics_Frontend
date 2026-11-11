import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { parseInvite } from './input';
import { isRole, type TeamMember, type TeamService } from './types';

// Invented people. ops@example.com is the demo sign-in, so the page can mark it as "you".
const SEED: TeamMember[] = [
  { id: 'tm_1', email: 'ops@example.com', name: 'Demo Merchant', role: 'admin', status: 'active' },
  { id: 'tm_2', email: 'meera@example.com', name: 'Meera Nair', role: 'operations', status: 'active' },
  { id: 'tm_3', email: 'kabir@example.com', name: 'Kabir Shah', role: 'finance', status: 'active' },
  { id: 'tm_4', email: 'isha@example.com', name: 'Isha Verma', role: 'viewer', status: 'active' },
  { id: 'tm_5', email: 'pending@example.com', name: null, role: 'viewer', status: 'invited' },
];

export const LAST_ADMIN_MESSAGE = 'At least one admin must remain. Make someone else an admin first.';

function fail<T>(kind: ApiError['kind'], status: number, message: string): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

/**
 * A team that keeps its changes in memory. The shared instance below is what the app uses; tests
 * make their own. Knowing who is signed in is the server action's job, because this service has no
 * session. The last-admin rule lives here, so no caller can break it.
 */
export function createMockTeamService(seed: TeamMember[] = SEED): TeamService {
  let members: TeamMember[] = seed.map((m) => ({ ...m }));
  let nextId = members.length + 1;
  const admins = () => members.filter((m) => m.role === 'admin').length;

  return {
    async listMembers() {
      return fromMock(members.map((m) => ({ ...m })));
    },

    async invite(email, role) {
      const parsed = parseInvite({ email, role });
      if (!parsed.ok) return fail<TeamMember>('validation', 400, parsed.message);
      if (members.some((m) => m.email === parsed.value.email)) {
        return fail<TeamMember>('conflict', 409, 'This email is already on your team.');
      }
      const member: TeamMember = {
        id: `tm_${nextId++}`,
        email: parsed.value.email,
        name: null,
        role: parsed.value.role,
        status: 'invited',
      };
      members = [...members, member];
      return fromMock({ ...member });
    },

    async changeRole(id, role) {
      if (!isRole(role)) return fail<TeamMember>('validation', 400, 'Choose a role.');
      const member = members.find((m) => m.id === id);
      if (!member) return fail<TeamMember>('not_found', 404, 'This team member no longer exists.');
      if (member.role === 'admin' && role !== 'admin' && admins() <= 1) {
        return fail<TeamMember>('conflict', 409, LAST_ADMIN_MESSAGE);
      }
      const updated = { ...member, role };
      members = members.map((m) => (m.id === id ? updated : m));
      return fromMock({ ...updated });
    },

    async remove(id) {
      const member = members.find((m) => m.id === id);
      if (!member) return fail<null>('not_found', 404, 'This team member no longer exists.');
      if (member.role === 'admin' && admins() <= 1) return fail<null>('conflict', 409, LAST_ADMIN_MESSAGE);
      members = members.filter((m) => m.id !== id);
      return fromMock(null);
    },
  };
}

export const mockTeamService: TeamService = createMockTeamService();
