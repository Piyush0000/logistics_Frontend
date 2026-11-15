import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The admin session cookie value: `<base64url email>.<expiry seconds>.<signature>`, signed with
 * HMAC-SHA256. The browser can read it but cannot change the email or the expiry without the secret.
 * Pure functions (no cookies, no env), so they are unit-tested directly.
 */

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** True when the two strings are equal, compared in constant time. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminToken(email: string, expiresAt: number, secret: string): string {
  const payload = `${Buffer.from(email).toString('base64url')}.${Math.floor(expiresAt)}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** The email inside a valid, unexpired token, or null. `now` is in seconds since the epoch. */
export function readAdminToken(token: string | undefined, secret: string, now: number): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedEmail, expiry, signature] = parts as [string, string, string];
  const payload = `${encodedEmail}.${expiry}`;
  if (!safeEqual(signature, sign(payload, secret))) return null;
  const expiresAt = Number(expiry);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return null;
  const email = Buffer.from(encodedEmail, 'base64url').toString('utf8');
  return email || null;
}
