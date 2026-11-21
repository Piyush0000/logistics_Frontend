import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import { ROLES, type TeamMember, type TeamService } from './types';

const memberSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.enum(ROLES),
  owner: z.boolean().optional(),
  status: z.enum(['active', 'invited']),
});

const toMember = (m: z.infer<typeof memberSchema>): TeamMember => ({ ...m, owner: m.owner ?? false });
const path = (id?: string) => `/api/v1/team${id ? `/${encodeURIComponent(id)}` : ''}`;

/** The team from /api/v1/team. Invites are shared as a link; nothing is emailed. */
export const gatewayTeamService: TeamService = {
  async listMembers() {
    const result = await gatewayFetch(path(), {
      schema: z.object({ items: z.array(memberSchema) }),
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: result.data.items.map(toMember) } : result);
  },

  async invite(email, role) {
    const result = await gatewayFetch(`${path()}/invites`, {
      method: 'POST',
      schema: z.object({ member: memberSchema, token: z.string() }),
      token: await merchantCredential('shipments'),
      body: { email, role },
    });
    return fromGateway(
      result.ok ? { ...result, data: { ...toMember(result.data.member), inviteToken: result.data.token } } : result,
    );
  },

  async changeRole(id, role) {
    const result = await gatewayFetch(path(id), {
      method: 'PATCH',
      schema: memberSchema,
      token: await merchantCredential('shipments'),
      body: { role },
    });
    return fromGateway(result.ok ? { ...result, data: toMember(result.data) } : result);
  },

  async remove(id) {
    const result = await gatewayFetch(path(id), {
      method: 'DELETE',
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: null } : result);
  },
};
