import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway, type DataResult } from '../source';
import type { SessionService, SignedInUser } from './types';

/** What the gateway's sign-in routes answer: a session token plus who it belongs to. */
const SignedInSchema = z.object({
  token: z.string().min(16),
  expires_at: z.string(),
  user: z.object({ email: z.string() }),
});

async function signIn(path: string, body: unknown): Promise<DataResult<SignedInUser>> {
  const result = await gatewayFetch(path, { method: 'POST', body, schema: SignedInSchema });
  if (!result.ok) return fromGateway(result);
  return {
    ok: true,
    source: 'gateway',
    data: {
      email: result.data.user.email,
      token: result.data.token,
      expiresAt: result.data.expires_at,
    },
  };
}

const AcceptedSchema = z.object({}).passthrough();

/** Real sign-in through the gateway's /api/v1/auth routes (the identity service). */
export const gatewaySessionService: SessionService = {
  async requestOtp(email) {
    const result = await gatewayFetch('/api/v1/auth/otp/request', {
      method: 'POST',
      body: { email },
      schema: AcceptedSchema,
    });
    // A real service emails the code, so there is never a code to show on screen.
    return result.ok ? { ok: true, source: 'gateway', data: {} } : fromGateway(result);
  },

  verifyOtp(email, code) {
    return signIn('/api/v1/auth/otp/verify', { email, code });
  },

  signInWithPassword(email, password) {
    return signIn('/api/v1/auth/login', { email, password });
  },

  signUp(input) {
    return signIn('/api/v1/auth/signup', input);
  },

  async requestPasswordReset(email) {
    const result = await gatewayFetch('/api/v1/auth/password-reset/request', {
      method: 'POST',
      body: { email },
      schema: AcceptedSchema,
    });
    return result.ok ? { ok: true, source: 'gateway', data: { demo: false } } : fromGateway(result);
  },
};
