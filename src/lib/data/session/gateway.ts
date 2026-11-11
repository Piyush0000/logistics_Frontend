import type { DataResult } from '../source';
import type { SessionService } from './types';

function unavailable(message: string) {
  return async (): Promise<DataResult<never>> => ({
    ok: false,
    source: 'gateway',
    error: { kind: 'unavailable', status: 0, message },
  });
}

const notAvailable = unavailable('Sign-in is not available yet.');

/** The gateway has no sign-in routes yet. Replace these when the backend adds them. */
export const gatewaySessionService: SessionService = {
  requestOtp: notAvailable,
  verifyOtp: notAvailable,
  signInWithPassword: notAvailable,
  requestPasswordReset: unavailable('Password reset is not available yet.'),
};
