import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewaySessionService } from './gateway';
import { sessionService } from './index';
import { DEMO_OTP_CODE, mockSessionService } from './mock';

describe('mockSessionService', () => {
  it('returns the demo code when a code is requested', async () => {
    const result = await mockSessionService.requestOtp('ops@example.com');

    expect(result).toEqual({ ok: true, source: 'mock', data: { demoCode: DEMO_OTP_CODE } });
  });

  it('signs in with the demo code', async () => {
    const result = await mockSessionService.verifyOtp('ops@example.com', DEMO_OTP_CODE);

    expect(result).toEqual({ ok: true, source: 'mock', data: { email: 'ops@example.com' } });
  });

  it('rejects any other code', async () => {
    const result = await mockSessionService.verifyOtp('ops@example.com', '000000');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('That code is incorrect. Check it and try again.');
  });

  it('signs in with a password', async () => {
    const result = await mockSessionService.signInWithPassword('ops@example.com', 'any-password');

    expect(result).toEqual({ ok: true, source: 'mock', data: { email: 'ops@example.com' } });
  });
});

describe('sessionService', () => {
  afterEach(() => {
    delete process.env.DATA_SOURCE_SESSION;
  });

  it('uses the mock by default', () => {
    expect(sessionService()).toBe(mockSessionService);
  });

  it('signs in through the gateway and returns the session token', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    const fetchMock = stubGateway(200, {
      token: 'evs_sess_abcdefghijklmnopqrstuvwxyz',
      expires_at: '2026-11-24T10:00:00.000Z',
      user: { email: 'ops@example.com' },
    });

    const result = await sessionService().signInWithPassword('ops@example.com', 'long-enough-1');

    expect(fetchMock.mock.calls[0]![0]).toBe('http://gateway.test/api/v1/auth/login');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      email: 'ops@example.com',
      password: 'long-enough-1',
    });
    expect(result).toEqual({
      ok: true,
      source: 'gateway',
      data: {
        email: 'ops@example.com',
        token: 'evs_sess_abcdefghijklmnopqrstuvwxyz',
        expiresAt: '2026-11-24T10:00:00.000Z',
      },
    });
  });

  it("passes the gateway's sign-in error to the screen", async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    stubGateway(401, { message: 'Email or password is incorrect.' });

    expect(await sessionService().verifyOtp('ops@example.com', DEMO_OTP_CODE)).toMatchObject({
      ok: false,
      source: 'gateway',
      error: { kind: 'unauthorized', message: 'Email or password is incorrect.' },
    });
  });

  it('refuses the demo sign-in in production by default', () => {
    expect(sessionService({ NODE_ENV: 'production' })).toBe(gatewaySessionService);
  });

  it('allows the demo sign-in in production only when ALLOW_DEMO_LOGIN is true', () => {
    expect(sessionService({ NODE_ENV: 'production', ALLOW_DEMO_LOGIN: 'true' })).toBe(
      mockSessionService,
    );
    expect(sessionService({ NODE_ENV: 'production', ALLOW_DEMO_LOGIN: '1' })).toBe(
      gatewaySessionService,
    );
  });
});

describe('requestPasswordReset', () => {
  afterEach(() => {
    delete process.env.DATA_SOURCE_SESSION;
  });

  it('answers the same way in demo mode for any email', async () => {
    const first = await mockSessionService.requestPasswordReset('ops@example.com');
    const second = await mockSessionService.requestPasswordReset('nobody@example.org');

    expect(first).toEqual({ ok: true, source: 'mock', data: { demo: true } });
    expect(second).toEqual(first);
  });

  it('asks the gateway to email a reset code', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    const fetchMock = stubGateway(202, { sent: true });

    const result = await sessionService().requestPasswordReset('ops@example.com');

    expect(fetchMock.mock.calls[0]![0]).toBe(
      'http://gateway.test/api/v1/auth/password-reset/request',
    );
    expect(result).toEqual({ ok: true, source: 'gateway', data: { demo: false } });
  });

  it('reports when email is not set up on the server yet', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    stubGateway(503, { message: 'Email sign-in is not available yet. Sign in with your password.' });

    expect(await sessionService().requestPasswordReset('ops@example.com')).toMatchObject({
      ok: false,
      error: { kind: 'unavailable' },
    });
  });
});

describe('signUp', () => {
  afterEach(() => {
    delete process.env.DATA_SOURCE_SESSION;
  });

  const input = {
    company: 'Acme Traders',
    name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '9876543210',
    password: 'long-enough-1',
  };

  it('returns only the email and never the password', async () => {
    const result = await mockSessionService.signUp(input);

    expect(result).toEqual({ ok: true, source: 'mock', data: { email: 'asha@example.com' } });
    expect(JSON.stringify(result)).not.toContain(input.password);
  });

  it('creates the account through the gateway and signs straight in', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    const fetchMock = stubGateway(201, {
      token: 'evs_sess_abcdefghijklmnopqrstuvwxyz',
      expires_at: '2026-11-24T10:00:00.000Z',
      user: { email: 'asha@example.com' },
    });

    const result = await sessionService().signUp(input);

    expect(fetchMock.mock.calls[0]![0]).toBe('http://gateway.test/api/v1/auth/signup');
    expect(result).toMatchObject({
      ok: true,
      data: { email: 'asha@example.com', token: 'evs_sess_abcdefghijklmnopqrstuvwxyz' },
    });
  });

  it('shows a taken email as the gateway words it', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    stubGateway(409, { message: 'An account with this email already exists. Sign in instead.' });

    expect(await sessionService().signUp(input)).toMatchObject({
      ok: false,
      error: { kind: 'conflict', message: 'An account with this email already exists. Sign in instead.' },
    });
  });
});

function stubGateway(status: number, body: unknown) {
  process.env.GATEWAY_URL = 'http://gateway.test';
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
    );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GATEWAY_URL;
});
