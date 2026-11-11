'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import { notificationService, parseNotificationInput, type NotificationFieldErrors } from '@/lib/data/notifications';

export type NotificationActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: NotificationFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';

// Server actions can be called directly, so this checks the session and the input itself.
export async function saveNotificationsAction(input: unknown): Promise<NotificationActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const parsed = parseNotificationInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await notificationService().save(parsed.value);
  if (!result.ok) {
    return { ok: false, message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message };
  }
  revalidatePath('/settings/notifications');
  return { ok: true, message: 'Notification settings saved.' };
}
