import type { DataResult } from '../source';
import type { SessionService } from './types';

async function notAvailable(): Promise<DataResult<never>> {
  return {
    ok: false,
    source: 'gateway',
    error: { kind: 'unavailable', status: 0, message: 'Sign-in is not available yet.' },
  };
}

/** The gateway has no sign-in routes yet. Replace these when the backend adds them. */
export const gatewaySessionService: SessionService = {
  requestOtp: notAvailable,
  verifyOtp: notAvailable,
  signInWithPassword: notAvailable,
};
