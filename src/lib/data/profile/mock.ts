import 'server-only';

import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { MIN_PASSWORD_LENGTH, parseProfileInput } from './input';
import type { Profile, ProfileService } from './types';

// An invented merchant. The page shows the signed-in email instead of this one.
const SAMPLE_PROFILE: Profile = { name: 'Demo Merchant', email: 'ops@example.com', phone: '+919800000000' };

function fail<T>(kind: ApiError['kind'], status: number, message: string): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

/**
 * A profile that keeps its changes in memory. The shared instance below is what the app uses;
 * tests make their own. A password is only checked, never kept, so no result can contain one.
 */
export function createMockProfileService(): ProfileService {
  let profile: Profile = { ...SAMPLE_PROFILE };

  return {
    async getProfile() {
      return fromMock({ ...profile });
    },

    async updateProfile(input) {
      // The server action checks this too. It is repeated here so no caller can store a bad profile.
      const parsed = parseProfileInput(input);
      if (!parsed.ok) return fail<Profile>('validation', 400, parsed.message);
      // Only the name and phone change. The email stays whatever it was.
      profile = { ...profile, ...parsed.value };
      return fromMock({ ...profile });
    },

    async changePassword(current, next) {
      if (current === '') return fail<null>('validation', 400, 'Enter your current password.');
      if (next.length < MIN_PASSWORD_LENGTH) {
        return fail<null>('validation', 400, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      if (next === current) {
        return fail<null>('validation', 400, 'Choose a password different from the current one.');
      }
      return fromMock(null);
    },
  };
}

export const mockProfileService: ProfileService = createMockProfileService();
