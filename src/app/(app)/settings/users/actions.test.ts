import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createMockTeamService } from '@/lib/data/team/mock';

const store = vi.hoisted(() => ({ service: null as unknown as import('@/lib/data/team').TeamService }));
vi.mock('@/lib/data/team', async (original) => ({
  ...(await original<typeof import('@/lib/data/team')>()),
  teamService: () => store.service,
}));

import { changeRoleAction, inviteAction, removeMemberAction } from './actions';

async function members() {
  const result = await store.service.listMembers();
  if (!result.ok) throw new Error('list failed');
  return result.data;
}

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  store.service = createMockTeamService();
});

describe('signed out', () => {
  it('refuses every action before touching the team', async () => {
    session.current = null;
    const before = await members();

    expect(await inviteAction({ email: 'new@example.com', role: 'viewer' })).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await changeRoleAction('tm_2', 'viewer')).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await removeMemberAction('tm_2')).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await members()).toEqual(before);
  });
});

describe('inviteAction', () => {
  it('validates on the server', async () => {
    for (const bad of [{ email: 'nope', role: 'viewer' }, { email: 'a@b.co', role: 'owner' }, { email: 'a@b.co' }, null]) {
      expect((await inviteAction(bad)).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(await members()).toHaveLength(5);
  });

  it('invites, and reports a duplicate', async () => {
    expect(await inviteAction({ email: 'new@example.com', role: 'finance' })).toEqual({
      ok: true,
      message: 'Invite sent to new@example.com.',
    });
    expect(await inviteAction({ email: 'NEW@example.com', role: 'finance' })).toEqual({
      ok: false,
      message: 'This email is already on your team.',
    });
  });
});

describe('changeRoleAction', () => {
  it('changes another member and refuses a bad role or an unknown id', async () => {
    expect(await changeRoleAction('tm_2', 'finance')).toEqual({ ok: true, message: 'meera@example.com is now Finance.' });
    expect((await changeRoleAction('tm_2', 'owner')).ok).toBe(false);
    expect((await changeRoleAction('nope', 'viewer')).ok).toBe(false);
    expect((await changeRoleAction(42, 'viewer')).ok).toBe(false);
  });

  it('refuses to change the signed-in person, whatever the email case', async () => {
    session.current = { email: 'Ops@Example.com' };
    const result = await changeRoleAction('tm_1', 'viewer');
    expect(result.ok).toBe(false);
    expect((await members())[0]?.role).toBe('admin');
  });

  it('keeps the last admin', async () => {
    session.current = { email: 'meera@example.com' };
    expect(await changeRoleAction('tm_1', 'viewer')).toEqual({
      ok: false,
      message: expect.stringContaining('At least one admin must remain'),
    });
  });
});

describe('removeMemberAction', () => {
  it('removes another member', async () => {
    expect(await removeMemberAction('tm_4')).toEqual({ ok: true, message: 'isha@example.com was removed.' });
    expect(await members()).toHaveLength(4);
  });

  it('refuses to remove the signed-in person', async () => {
    const result = await removeMemberAction('tm_1');
    expect(result.ok).toBe(false);
    expect(await members()).toHaveLength(5);
  });

  it('keeps the last admin, and refuses unknown ids', async () => {
    session.current = { email: 'meera@example.com' };
    expect(await removeMemberAction('tm_1')).toMatchObject({ ok: false, message: expect.stringContaining('At least one admin') });
    expect((await removeMemberAction('nope')).ok).toBe(false);
  });
});
