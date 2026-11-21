import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { z } from 'zod';
import { sessionService } from '../data/session';
import { mockSessionService } from '../data/session/mock';
import type { SignedInUser } from '../data/session/types';
import { gatewayFetch } from '../gateway/client';
import type { Role } from '../data/team/types';
import { roleFromIdentity } from './access';
import { SESSION_COOKIE } from './credentials';
import { emailSchema } from './login-schema';

// Separate from SESSION_COOKIE, whose value is sent to the gateway as a merchant credential.
export const DEMO_SESSION_COOKIE = 'evoc_demo_session';

const DEMO_SESSION_LENGTH_SECONDS = 8 * 60 * 60;
const MAX_SESSION_SECONDS = 7 * 24 * 60 * 60;

/** Who is signed in. The name stays "demo" for history; it now covers real sessions too. */
export interface DemoSession {
  email: string;
  /** What this person may use. Sample-data sign-in is admin. */
  role: Role;
}

export function parseDemoSession(value: string | undefined): DemoSession | null {
  const email = emailSchema.safeParse(value);
  return email.success ? { email: email.data, role: 'admin' } : null;
}

const MeSchema = z.object({
  email: z.string().nullable(),
  merchant_name: z.string(),
  kind: z.string().optional(),
  role: z.string().nullable().optional(),
});

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

/**
 * The signed-in user, read once per request however many server components ask.
 *
 * A real session token is checked with the gateway on every request, so an expired or signed-out
 * session reads as signed out. The demo cookie counts only while the demo sign-in is in use.
 */
export const getDemoSession = cache(async (): Promise<DemoSession | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const me = await gatewayFetch('/api/v1/auth/me', { schema: MeSchema, token });
    if (!me.ok) return null;
    return {
      email: me.data.email ?? me.data.merchant_name,
      role: roleFromIdentity(me.data.kind, me.data.role),
    };
  }
  if (sessionService() !== mockSessionService) return null;
  return parseDemoSession(store.get(DEMO_SESSION_COOKIE)?.value);
});

/** Starts a session after sign-in or sign-up: the real token when there is one, else the demo. */
export async function startSession(user: SignedInUser): Promise<void> {
  const store = await cookies();
  if (user.token) {
    const untilExpiry = user.expiresAt
      ? Math.floor((Date.parse(user.expiresAt) - Date.now()) / 1000)
      : MAX_SESSION_SECONDS;
    const maxAge = Math.max(60, Math.min(MAX_SESSION_SECONDS, untilExpiry || MAX_SESSION_SECONDS));
    store.set(SESSION_COOKIE, user.token, cookieOptions(maxAge));
    store.delete(DEMO_SESSION_COOKIE);
    return;
  }
  store.set(DEMO_SESSION_COOKIE, user.email, cookieOptions(DEMO_SESSION_LENGTH_SECONDS));
}

/** Signs out: ends the session on the server too, so a copied cookie stops working at once. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await gatewayFetch('/api/v1/auth/logout', { method: 'POST', token }).catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
  store.delete(DEMO_SESSION_COOKIE);
}

/** Kept for existing callers and tests of the demo sign-in. */
export async function createDemoSession(email: string): Promise<void> {
  await startSession({ email });
}

export async function endDemoSession(): Promise<void> {
  await endSession();
}
