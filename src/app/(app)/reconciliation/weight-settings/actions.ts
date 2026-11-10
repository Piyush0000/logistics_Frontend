'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import type { DataResult } from '@/lib/data/source';
import { parsePresetInput, weightSettingsService } from '@/lib/data/weight-settings';
import type { PresetFieldErrors } from '@/lib/data/weight-settings';

export type PresetActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: PresetFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';
const PATH = '/reconciliation/weight-settings';

function answer(result: DataResult<unknown>, done: string): PresetActionResult {
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message,
    };
  }
  revalidatePath(PATH);
  return { ok: true, message: done };
}

// Server actions can be called directly, so each one checks the session and the input itself.
export async function savePresetAction(input: unknown): Promise<PresetActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parsePresetInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await weightSettingsService().savePreset(parsed.value);
  return answer(result, result.ok ? `Saved ${result.data.name}.` : '');
}

export async function deletePresetAction(id: unknown): Promise<PresetActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (typeof id !== 'string' || id === '' || id.length > 100) {
    return { ok: false, message: 'Choose a preset to delete.' };
  }
  return answer(await weightSettingsService().deletePreset(id), 'Preset deleted.');
}
