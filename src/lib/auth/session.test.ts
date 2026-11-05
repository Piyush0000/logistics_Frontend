import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE } from './credentials';
import { DEMO_SESSION_COOKIE, parseDemoSession } from './session';

describe('parseDemoSession', () => {
  it('reads the email from a valid cookie', () => {
    expect(parseDemoSession('ops@example.com')).toEqual({ email: 'ops@example.com' });
  });

  it('treats a missing cookie as signed out', () => {
    expect(parseDemoSession(undefined)).toBeNull();
  });

  it('treats a tampered cookie as signed out', () => {
    expect(parseDemoSession('<script>')).toBeNull();
  });
});

describe('DEMO_SESSION_COOKIE', () => {
  it('differs from the real session cookie, which is sent to the gateway as a credential', () => {
    expect(DEMO_SESSION_COOKIE).not.toBe(SESSION_COOKIE);
  });
});
