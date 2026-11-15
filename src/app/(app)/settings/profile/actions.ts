'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import {
  parsePasswordChange,
  parseProfileInput,
  profileService,
  type PasswordFieldErrors,
  type ProfileFieldErrors,
} from '@/lib/data/profile';
import type { DataResult } from '@/lib/data/source';

export type ProfileActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: ProfileFieldErrors };

export type PasswordActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: PasswordFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';

function failure(result: Extract<DataResult<unknown>, { ok: false }>) {
  return {
    ok: false as const,
    message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message,
  };
}

// Server actions can be called directly, so each one checks the session and the input itself.
export async function saveProfileAction(input: unknown): Promise<ProfileActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parseProfileInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await profileService().updateProfile(parsed.value);
  if (!result.ok) return failure(result);
  revalidatePath('/settings/profile');
  return { ok: true, message: 'Profile saved.' };
}

export async function changePasswordAction(input: unknown): Promise<PasswordActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parsePasswordChange(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await profileService().changePassword(parsed.value.current, parsed.value.next);
  if (!result.ok) return failure(result);
  return { ok: true, message: 'Password changed.' };
}
