'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import {
  checkLogo,
  parseBrandingInput,
  trackingPageService,
  type BrandingFieldErrors,
} from '@/lib/data/tracking-page';

export type TrackingPageActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: BrandingFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';
const NOT_UNDERSTOOD = 'We could not read that form. Reload the page and try again.';

/**
 * Only the logo name, type and size arrive here, never its bytes. The logo is "keep", "remove" or
 * the details of a new file. Server actions can be called directly, so this checks the session and
 * the input itself.
 */
export async function saveTrackingPageAction(input: unknown): Promise<TrackingPageActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : null;
  if (!raw) return { ok: false, message: NOT_UNDERSTOOD };

  const service = trackingPageService();
  const current = await service.get();
  if (!current.ok) {
    return { ok: false, message: current.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : current.error.message };
  }

  let logoName: string | null;
  const logo = raw.logo;
  if (logo === 'keep') {
    logoName = current.data.logoName;
  } else if (logo === 'remove') {
    logoName = null;
  } else if (typeof logo === 'object' && logo !== null) {
    const file = logo as Record<string, unknown>;
    if (typeof file.name !== 'string' || typeof file.type !== 'string' || typeof file.size !== 'number') {
      return { ok: false, message: NOT_UNDERSTOOD };
    }
    const problem = checkLogo({ name: file.name, type: file.type, size: file.size });
    if (problem) return { ok: false, message: problem };
    logoName = file.name;
  } else {
    return { ok: false, message: NOT_UNDERSTOOD };
  }

  const parsed = parseBrandingInput({ ...raw, logoName });
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await service.save(parsed.value);
  if (!result.ok) {
    return { ok: false, message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message };
  }
  revalidatePath('/settings/tracking-page');
  return { ok: true, message: 'Tracking page settings saved.' };
}
