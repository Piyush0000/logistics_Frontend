import { fromMock } from '../source';
import type { SessionService } from './types';

export const DEMO_OTP_CODE = '123456';

export const mockSessionService: SessionService = {
  async requestOtp() {
    return fromMock({ demoCode: DEMO_OTP_CODE });
  },

  async verifyOtp(email, code) {
    if (code === DEMO_OTP_CODE) return fromMock({ email });
    return {
      ok: false,
      source: 'mock',
      error: {
        kind: 'validation',
        status: 0,
        message: 'That code is incorrect. Check it and try again.',
      },
    };
  },

  async signInWithPassword(email) {
    return fromMock({ email });
  },
};
