'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import { parseSubMerchantInput, subMerchantService, type SubMerchantFieldErrors } from '@/lib/data/sub-merchants';

export type OnboardResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: SubMerchantFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';

// Server actions can be called directly, so this checks the session and the input itself.
export async function onboardSubMerchantAction(input: unknown): Promise<OnboardResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parseSubMerchantInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await subMerchantService().onboard(parsed.value);
  if (!result.ok) {
    return { ok: false, message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message };
  }
  revalidatePath('/settings/sub-merchants');
  return { ok: true, message: `${result.data.name} was onboarded.` };
}
