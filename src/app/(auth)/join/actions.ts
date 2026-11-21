'use server';

import { redirect } from 'next/navigation';
import { getDemoSession, startSession } from '@/lib/auth/session';
import { newPasswordSchema, personNameSchema } from '@/lib/auth/signup-schema';
import { acceptInvite, previewInvite, type InvitePreview } from '@/lib/data/session/invite';

const INVALID = 'This invite link is not valid any more. Ask your admin for a new one.';
const tokenOk = (token: unknown): token is string =>
  typeof token === 'string' && /^evs_inv_[A-Za-z0-9_-]{16,}$/.test(token);

export type PreviewResult = { ok: true; invite: InvitePreview } | { ok: false; message: string };
export type JoinResult = { ok: false; message: string };

/** Public: the person opening an invite link is not signed in yet. */
export async function previewInviteAction(token: unknown): Promise<PreviewResult> {
  if (!tokenOk(token)) return { ok: false, message: INVALID };
  const result = await previewInvite(token);
  return result.ok ? { ok: true, invite: result.data } : { ok: false, message: result.error.message || INVALID };
}

/** Creates the account from the invite and signs in; never replaces an existing session. */
export async function joinAction(input: unknown): Promise<JoinResult> {
  if (await getDemoSession()) redirect('/home');
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  if (!tokenOk(raw.token)) return { ok: false, message: INVALID };
  const name = personNameSchema.safeParse(raw.name);
  if (!name.success) return { ok: false, message: name.error.issues[0]?.message ?? 'Enter your name.' };
  const password = newPasswordSchema.safeParse(raw.password);
  if (!password.success) {
    return { ok: false, message: password.error.issues[0]?.message ?? 'Choose a password.' };
  }
  const result = await acceptInvite({ token: raw.token, name: name.data, password: password.data });
  if (!result.ok) return { ok: false, message: result.error.message || INVALID };
  await startSession(result.data);
  redirect('/home');
}
