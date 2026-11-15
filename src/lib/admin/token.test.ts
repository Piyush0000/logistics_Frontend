import { describe, expect, it } from 'vitest';
import { adminConfig, DEMO_ADMIN } from './credentials';
import { createAdminToken, readAdminToken, safeEqual } from './token';

const SECRET = 'a'.repeat(40);
const NOW = 1_800_000_000;

describe('admin token', () => {
  it('reads back the email from a valid token', () => {
    const token = createAdminToken('founder@evocships.com', NOW + 60, SECRET);
    expect(readAdminToken(token, SECRET, NOW)).toBe('founder@evocships.com');
  });

  it('rejects an expired token', () => {
    const token = createAdminToken('founder@evocships.com', NOW - 1, SECRET);
    expect(readAdminToken(token, SECRET, NOW)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const token = createAdminToken('founder@evocships.com', NOW + 60, 'b'.repeat(40));
    expect(readAdminToken(token, SECRET, NOW)).toBeNull();
  });

  it('rejects a token whose email or expiry was edited', () => {
    const token = createAdminToken('founder@evocships.com', NOW + 60, SECRET);
    const [, expiry, signature] = token.split('.');
    const otherEmail = Buffer.from('attacker@example.com').toString('base64url');
    expect(readAdminToken(`${otherEmail}.${expiry}.${signature}`, SECRET, NOW)).toBeNull();
    const [email] = token.split('.');
    expect(readAdminToken(`${email}.${NOW + 999_999}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('rejects missing and malformed values', () => {
    expect(readAdminToken(undefined, SECRET, NOW)).toBeNull();
    expect(readAdminToken('', SECRET, NOW)).toBeNull();
    expect(readAdminToken('a.b', SECRET, NOW)).toBeNull();
    expect(readAdminToken('a.b.c.d', SECRET, NOW)).toBeNull();
  });

  it('compares strings safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('adminConfig', () => {
  it('uses the demo account outside production', () => {
    expect(adminConfig({ NODE_ENV: 'development' })).toEqual(DEMO_ADMIN);
  });

  it('refuses every sign-in in production without full configuration', () => {
    expect(adminConfig({ NODE_ENV: 'production' })).toBeNull();
    expect(
      adminConfig({ NODE_ENV: 'production', ADMIN_EMAIL: 'f@e.com', ADMIN_PASSWORD: 'x', ADMIN_SESSION_SECRET: 'short' }),
    ).toBeNull();
  });

  it('uses the configured account in production', () => {
    expect(
      adminConfig({
        NODE_ENV: 'production',
        ADMIN_EMAIL: ' Founder@EvocShips.com ',
        ADMIN_PASSWORD: 'long-password',
        ADMIN_SESSION_SECRET: SECRET,
      }),
    ).toEqual({ email: 'founder@evocships.com', password: 'long-password', secret: SECRET });
  });
});
