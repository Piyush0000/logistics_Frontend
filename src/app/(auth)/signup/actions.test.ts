import { afterEach, describe, expect, it, vi } from 'vitest';

const created = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/session', () => ({ createDemoSession: created }));
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
  });

  it('creates the session and redirects to Home', async () => {
    await expect(signUpAction(IDLE, form())).rejects.toThrow('REDIRECT:/home');
    expect(created).toHaveBeenCalledWith('asha@example.com');
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

  it('refuses signup when the session service is set to gateway', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';

    expect(await signUpAction(IDLE, form())).toEqual({
      status: 'error',
      message: 'Sign-in is not available yet.',
    });
    expect(created).not.toHaveBeenCalled();
  });
});
