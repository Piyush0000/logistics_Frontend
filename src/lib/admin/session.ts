import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { adminConfig, type AdminConfig } from './credentials';
import { createAdminToken, readAdminToken, safeEqual } from './token';

/** Separate from the merchant session cookies: a merchant sign-in never opens the admin panel. */
export const ADMIN_SESSION_COOKIE = 'evoc_admin_session';
const SESSION_LENGTH_SECONDS = 8 * 60 * 60;

export interface AdminSession {
  email: string;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** The signed-in admin, read once per request however many components ask. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  // Read cookies first, so every admin page renders per request. Checking the config first would
  // let a build without ADMIN_* variables prerender the pages and ignore variables set at runtime.
  const store = await cookies();
  const config = adminConfig();
  if (!config) return null;
  const email = readAdminToken(store.get(ADMIN_SESSION_COOKIE)?.value, config.secret, nowSeconds());
  return email && email === config.email ? { email } : null;
});

/**
 * Every admin page calls this first. It redirects to the admin sign-in when there is no session.
 * (The admin layout does not redirect, so a page that does not exist can still answer 404.)
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

export type SignInResult = 'ok' | 'invalid' | 'unavailable';

/** Checks the email and password against the configured account and starts a session. */
export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const config: AdminConfig | null = adminConfig();
  if (!config) return 'unavailable';
  const emailOk = safeEqual(email.trim().toLowerCase(), config.email);
  const passwordOk = safeEqual(password, config.password);
  if (!emailOk || !passwordOk) return 'invalid';

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, createAdminToken(config.email, nowSeconds() + SESSION_LENGTH_SECONDS, config.secret), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: SESSION_LENGTH_SECONDS,
  });
  return 'ok';
}

export async function signOutAdmin(): Promise<void> {
  const store = await cookies();
  store.delete({ name: ADMIN_SESSION_COOKIE, path: '/admin' });
}
