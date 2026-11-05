import 'server-only';

import { cookies } from 'next/headers';
import { emailSchema } from './login-schema';

// Separate from SESSION_COOKIE, whose value is sent to the gateway as a merchant credential.
export const DEMO_SESSION_COOKIE = 'evoc_demo_session';

const SESSION_LENGTH_SECONDS = 8 * 60 * 60;

export interface DemoSession {
  email: string;
}

export function parseDemoSession(value: string | undefined): DemoSession | null {
  const email = emailSchema.safeParse(value);
  return email.success ? { email: email.data } : null;
}

export async function getDemoSession(): Promise<DemoSession | null> {
  const store = await cookies();
  return parseDemoSession(store.get(DEMO_SESSION_COOKIE)?.value);
}

export async function createDemoSession(email: string): Promise<void> {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_LENGTH_SECONDS,
  });
}

export async function endDemoSession(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_SESSION_COOKIE);
}
