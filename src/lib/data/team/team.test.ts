import { describe, expect, it, vi } from 'vitest';
import { gatewayTeamService } from './gateway';

import { teamService } from './index';
import { parseInvite } from './input';
import { createMockTeamService, mockTeamService } from './mock';
import { ROLE_DESCRIPTIONS, ROLES, type TeamMember } from './types';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

async function list(service = createMockTeamService()) {
  const result = await service.listMembers();
  if (!result.ok) throw new Error('list failed');
  return result.data;
}

describe('parseInvite', () => {
  it('lowercases and trims the email', () => {
    expect(parseInvite({ email: '  New@Example.COM ', role: 'finance' })).toEqual({
      ok: true,
      value: { email: 'new@example.com', role: 'finance' },
    });
  });

  it('refuses a bad email, a missing role and a non-object', () => {
    expect(parseInvite({ email: 'nope', role: 'viewer' })).toMatchObject({
      ok: false,
      errors: { email: 'Enter a valid email address.' },
    });
    expect(parseInvite({ email: 'a@b.co', role: 'owner' })).toMatchObject({
      ok: false,
      errors: { role: 'Choose a role.' },
    });
    expect(parseInvite(null).ok).toBe(false);
  });
});

describe('role descriptions', () => {
  it('describe every role', () => {
    for (const role of ROLES) expect(ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(10);
  });
});

describe('mock team service', () => {
  it('invites a member as invited, with the chosen role', async () => {
    const service = createMockTeamService();
    const result = await service.invite('new@example.com', 'finance');
    expect(result).toMatchObject({
      ok: true,
      data: { email: 'new@example.com', role: 'finance', status: 'invited', name: null },
    });
    expect((await list(service)).map((m) => m.email)).toContain('new@example.com');
  });

  it('rejects a duplicate invite, whatever the case', async () => {
    const service = createMockTeamService();
    const result = await service.invite('OPS@example.com', 'viewer');
    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'conflict', message: 'This email is already on your team.' },
    });
  });

  it('rejects an invalid invite', async () => {
    expect(await createMockTeamService().invite('nope', 'viewer')).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
  });

  it('changes a role', async () => {
    const service = createMockTeamService();
    const second = (await list(service))[1]!;
    expect(await service.changeRole(second.id, 'viewer')).toMatchObject({ ok: true, data: { role: 'viewer' } });
  });

  it('blocks removing the last admin', async () => {
    const service = createMockTeamService();
    const [admin] = (await list(service)) as [TeamMember];
    expect(await service.remove(admin.id)).toMatchObject({ ok: false, error: { kind: 'conflict' } });
    expect((await list(service)).length).toBe(5);
  });

  it('blocks demoting the last admin, but allows it once another admin exists', async () => {
    const service = createMockTeamService();
    const [admin, second] = (await list(service)) as [TeamMember, TeamMember];
    expect(await service.changeRole(admin.id, 'viewer')).toMatchObject({ ok: false, error: { kind: 'conflict' } });
    await service.changeRole(second.id, 'admin');
    expect(await service.changeRole(admin.id, 'viewer')).toMatchObject({ ok: true });
    expect(await service.remove(second.id)).toMatchObject({ ok: false });
  });

  it('reports unknown ids and keeps copies out of the store', async () => {
    const service = createMockTeamService();
    expect(await service.remove('nope')).toMatchObject({ ok: false, error: { kind: 'not_found' } });
    expect(await service.changeRole('nope', 'viewer')).toMatchObject({ ok: false, error: { kind: 'not_found' } });
    const first = (await list(service))[0]!;
    first.role = 'viewer';
    expect((await list(service))[0]!.role).toBe('admin');
  });
});

describe('gateway team service', () => {
  it('lists, invites (with the one-time token), changes roles and removes', async () => {
    const member = { id: 'u1', email: 'a@b.co', name: null, role: 'viewer', owner: false, status: 'invited' };
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/invites')) return Response.json({ member, token: 'evs_inv_abc', expires_at: 'x' });
      if (init?.method === 'PATCH') return Response.json({ ...member, role: 'finance' });
      return Response.json({ items: [{ ...member, id: 'o1', owner: true, role: 'admin', status: 'active' }] });
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await gatewayTeamService.listMembers()).toMatchObject({ ok: true, data: [{ owner: true, role: 'admin' }] });
    expect(await gatewayTeamService.invite('a@b.co', 'viewer')).toMatchObject({
      ok: true,
      data: { email: 'a@b.co', status: 'invited', inviteToken: 'evs_inv_abc' },
    });
    expect(await gatewayTeamService.changeRole('u1', 'finance')).toMatchObject({ ok: true, data: { role: 'finance' } });
    expect(await gatewayTeamService.remove('u1')).toMatchObject({ ok: true, data: null });
    expect(fetchMock.mock.calls.map(([url, init]) => [init?.method ?? 'GET', new URL(url).pathname])).toEqual([
      ['GET', '/api/v1/team'],
      ['POST', '/api/v1/team/invites'],
      ['PATCH', '/api/v1/team/u1'],
      ['DELETE', '/api/v1/team/u1'],
    ]);
    vi.unstubAllGlobals();
  });

  it('is chosen by DATA_SOURCE_TEAM', () => {
    const before = process.env.DATA_SOURCE_TEAM;
    try {
      delete process.env.DATA_SOURCE_TEAM;
      expect(teamService()).toBe(mockTeamService);
      process.env.DATA_SOURCE_TEAM = 'gateway';
      expect(teamService()).toBe(gatewayTeamService);
    } finally {
      if (before === undefined) delete process.env.DATA_SOURCE_TEAM;
      else process.env.DATA_SOURCE_TEAM = before;
    }
  });
});
