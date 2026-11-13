import 'server-only';

import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { parseBrandingInput } from './input';
import type { TrackingPageBranding, TrackingPageService } from './types';

// An invented brand, so the form and preview have something to show.
const SAMPLE: TrackingPageBranding = {
  displayName: 'Sample Store',
  supportEmail: 'support@example.com',
  supportPhone: '',
  accent: 'primary',
  showCourier: true,
  logoName: null,
};

/** Branding kept in memory. The shared instance is what the app uses; tests make their own. */
export function createMockTrackingPageService(): TrackingPageService {
  let branding: TrackingPageBranding = { ...SAMPLE };

  return {
    async get() {
      return fromMock({ ...branding });
    },

    async save(input) {
      // The server action checks this too. It is repeated here so no caller can store bad branding.
      const parsed = parseBrandingInput(input);
      if (!parsed.ok) {
        const error: ApiError = { kind: 'validation', status: 400, message: parsed.message };
        return { ok: false, source: 'mock', error } satisfies DataResult<never>;
      }
      branding = { ...parsed.value };
      return fromMock({ ...branding });
    },
  };
}

export const mockTrackingPageService: TrackingPageService = createMockTrackingPageService();
