import { afterEach, describe, expect, it } from 'vitest';
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

  it('reports that the gateway has no sign-in route yet', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';

    const result = await sessionService().verifyOtp('ops@example.com', DEMO_OTP_CODE);

    expect(result).toMatchObject({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', message: 'Sign-in is not available yet.' },
    });
  });
});
