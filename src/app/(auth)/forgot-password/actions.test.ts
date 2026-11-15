import { afterEach, describe, expect, it } from 'vitest';
import { requestPasswordResetAction } from './actions';
import { IDLE } from './forgot-state';

function form(email: string) {
  const data = new FormData();
  data.set('email', email);
  return data;
}

describe('requestPasswordResetAction', () => {
  afterEach(() => {
    delete process.env.DATA_SOURCE_SESSION;
  });

  it('gives the same message for any valid email, and says no email is sent in demo mode', async () => {
    const known = await requestPasswordResetAction(IDLE, form('ops@example.com'));
    const unknown = await requestPasswordResetAction(IDLE, form('nobody@example.org'));

    expect(known).toEqual({
      status: 'sent',
      message: 'If an account exists for this email, a reset link is on its way.',
      demo: true,
    });
    expect(unknown).toEqual(known);
  });

  it('rejects an invalid email', async () => {
    expect(await requestPasswordResetAction(IDLE, form('nope'))).toEqual({
      status: 'error',
      message: 'Enter a valid work email.',
    });
    expect(await requestPasswordResetAction(IDLE, form(''))).toMatchObject({ status: 'error' });
  });

  it('shows the unavailable message in gateway mode', async () => {
    process.env.DATA_SOURCE_SESSION = 'gateway';

    expect(await requestPasswordResetAction(IDLE, form('ops@example.com'))).toEqual({
      status: 'error',
      message: 'Password reset is not available yet.',
    });
  });
});
