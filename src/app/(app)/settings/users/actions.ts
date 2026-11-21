'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getDemoSession } from '@/lib/auth/session';
import type { DataResult } from '@/lib/data/source';
import {
  isRole,
  parseInvite,
  ROLE_LABELS,
  teamService,
  type InviteFieldErrors,
} from '@/lib/data/team';

export type InviteActionResult =
  | { ok: true; message: string; inviteLink?: string }
  | { ok: false; message: string; errors?: InviteFieldErrors };

export type TeamActionResult = { ok: true; message: string } | { ok: false; message: string };

const SIGN_IN_AGAIN = 'Sign in again.';
const OWN_ROW = 'You cannot change your own role or remove yourself. Ask another admin.';
const GONE = 'This team member no longer exists.';

function failure(result: Extract<DataResult<unknown>, { ok: false }>) {
  return {
    ok: false as const,
    message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message,
  };
}

/** Finds the member, and says whether it is the signed-in person. Callers can send any id. */
async function find(id: unknown, email: string) {
  if (typeof id !== 'string' || id === '') return { ok: false as const, error: GONE };
  const list = await teamService().listMembers();
  if (!list.ok) return { ok: false as const, error: failure(list).message };
  const member = list.data.find((m) => m.id === id);
  if (!member) return { ok: false as const, error: GONE };
  return { ok: true as const, member, isSelf: member.email.toLowerCase() === email.toLowerCase() };
}

// Server actions can be called directly, so each one checks the session and the input itself.
export async function inviteAction(input: unknown): Promise<InviteActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parseInvite(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await teamService().invite(parsed.value.email, parsed.value.role);
  if (!result.ok) return failure(result);
  revalidatePath('/settings/users');
  if (!result.data.inviteToken) return { ok: true, message: `Invite sent to ${result.data.email}.` };
  // The token goes after #, so it never reaches a server log when the link is opened.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'ship.evoclabs.com';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return {
    ok: true,
    message: `Invited ${result.data.email}. Send them this link; it works once, for 7 days.`,
    inviteLink: `${proto}://${host}/join#${result.data.inviteToken}`,
  };
}

export async function changeRoleAction(id: unknown, role: unknown): Promise<TeamActionResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, message: SIGN_IN_AGAIN };
  if (!isRole(role)) return { ok: false, message: 'Choose a role.' };

  const found = await find(id, session.email);
  if (!found.ok) return { ok: false, message: found.error };
  if (found.isSelf) return { ok: false, message: OWN_ROW };

  const result = await teamService().changeRole(found.member.id, role);
  if (!result.ok) return failure(result);
  revalidatePath('/settings/users');
  return { ok: true, message: `${result.data.email} is now ${ROLE_LABELS[role]}.` };
}

export async function removeMemberAction(id: unknown): Promise<TeamActionResult> {
  const session = await getDemoSession();
  if (!session) return { ok: false, message: SIGN_IN_AGAIN };

  const found = await find(id, session.email);
  if (!found.ok) return { ok: false, message: found.error };
  if (found.isSelf) return { ok: false, message: OWN_ROW };

  const result = await teamService().remove(found.member.id);
  if (!result.ok) return failure(result);
  revalidatePath('/settings/users');
  return { ok: true, message: `${found.member.email} was removed.` };
}
