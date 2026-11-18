import { afterEach, describe, expect, it, vi } from 'vitest';

const created = vi.hoisted(() => vi.fn());
const current = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/session', () => ({ startSession: created, getDemoSession: current }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { signUpAction } from './actions';
import { IDLE } from './signup-state';

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields: Record<string, string> = {
    company: 'Acme Traders',
    name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '9876543210',
    password: 'long-enough-1',
    terms: 'on',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) if (value !== '') data.set(key, value);
  return data;
}

describe('signUpAction', () => {
  afterEach(() => {
    delete process.env.DATA_SOURCE_SESSION;
    created.mockClear();
    current.mockReset();
  });

  it('leaves an existing session alone', async () => {
    current.mockResolvedValue({ email: 'ops@example.com' });

    await expect(signUpAction(IDLE, form())).rejects.toThrow('REDIRECT:/home');
    expect(created).not.toHaveBeenCalled();
  });

  it('creates the session and redirects to Home', async () => {
    await expect(signUpAction(IDLE, form())).rejects.toThrow('REDIRECT:/home');
    expect(created).toHaveBeenCalledWith({ email: 'asha@example.com' });
  });

  it('requires the terms', async () => {
    expect(await signUpAction(IDLE, form({ terms: '' }))).toEqual({
      status: 'error',
      message: 'Accept the terms to continue.',
    });
    expect(created).not.toHaveBeenCalled();
  });

  it('rejects a short password and over-long fields', async () => {
    expect(await signUpAction(IDLE, form({ password: 'short' }))).toMatchObject({ status: 'error' });
    expect(await signUpAction(IDLE, form({ company: 'x'.repeat(81) }))).toMatchObject({
      status: 'error',
    });
    expect(
      await signUpAction(IDLE, form({ email: `${'a'.repeat(250)}@example.com` })),
    ).toMatchObject({ status: 'error' });
    expect(created).not.toHaveBeenCalled();
  });

  it('signs up through the gateway and keeps the real session token', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    process.env.GATEWAY_URL = 'http://gateway.test';
    const session = {
      token: 'evs_sess_abcdefghijklmnopqrstuvwxyz',
      expires_at: '2026-11-24T10:00:00.000Z',
      user: { email: 'asha@example.com' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(session), { status: 201 })),
    );
    try {
      await expect(signUpAction(IDLE, form())).rejects.toThrow('REDIRECT:/home');
      expect(created).toHaveBeenCalledWith({
        email: 'asha@example.com',
        token: session.token,
        expiresAt: session.expires_at,
      });
    } finally {
      vi.unstubAllGlobals();
      delete process.env.GATEWAY_URL;
    }
  });

  it('shows the gateway error and starts no session when sign-up fails', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';
    process.env.GATEWAY_URL = 'http://gateway.test';
    const message = 'An account with this email already exists. Sign in instead.';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message }), { status: 409 })),
    );
    try {
      expect(await signUpAction(IDLE, form())).toEqual({ status: 'error', message });
      expect(created).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      delete process.env.GATEWAY_URL;
    }
  });
});
