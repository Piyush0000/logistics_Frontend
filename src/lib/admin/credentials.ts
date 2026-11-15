/**
 * The single admin account. There is one trusted user (the founder), so there are no roles: the
 * account is configured by environment variables, not stored in a database.
 *
 * Production needs all three variables; without them the admin panel refuses every sign-in.
 * Outside production, missing values fall back to the demo account below so the panel runs locally.
 */

type Env = Record<string, string | undefined>;

export interface AdminConfig {
  email: string;
  password: string;
  /** Signs the session cookie. At least 32 characters. */
  secret: string;
}

export const DEMO_ADMIN: AdminConfig = {
  email: 'admin@evocships.test',
  password: 'evoc-admin-demo',
  secret: 'evoc-admin-demo-secret-not-for-production-use',
};

export const MIN_SECRET_LENGTH = 32;

export function adminConfig(env: Env = process.env): AdminConfig | null {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET;

  if (env.NODE_ENV === 'production') {
    if (!email || !password || !secret || secret.length < MIN_SECRET_LENGTH) return null;
    return { email, password, secret };
  }
  return {
    email: email || DEMO_ADMIN.email,
    password: password || DEMO_ADMIN.password,
    secret: secret && secret.length >= MIN_SECRET_LENGTH ? secret : DEMO_ADMIN.secret,
  };
}
