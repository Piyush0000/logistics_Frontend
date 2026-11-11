'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import {
  applyNotificationChanges,
  notificationService,
  parseNotificationChanges,
  parseNotificationInput,
  type NotificationChanges,
  type NotificationFieldErrors,
  type NotificationSettings,
} from '@/lib/data/notifications';

export type NotificationActionResult =
  | { ok: true; message: string; settings: NotificationSettings }
  | { ok: false; message: string; errors?: NotificationFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';

// Read, merge and save must not interleave with another save, or the later one would write back the older state.
let queue: Promise<unknown> = Promise.resolve();
function inOrder<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Saves only the events the merchant changed. The changes go on top of the settings as they are now, so
 * a save from another tab or user never undoes an event this one did not touch. Server actions can be
 * called directly, so this checks the session and every rule itself.
 */
export async function saveNotificationsAction(input: unknown): Promise<NotificationActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const changes = parseNotificationChanges(input);
  if (!changes.ok) return { ok: false, message: changes.message };

  return inOrder(() => mergeAndSave(changes.value));
}

async function mergeAndSave(changes: NotificationChanges): Promise<NotificationActionResult> {
  const service = notificationService();
  const current = await service.get();
  if (!current.ok) {
    return { ok: false, message: current.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : current.error.message };
  }

  const parsed = parseNotificationInput(applyNotificationChanges(current.data, changes));
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await service.save(parsed.value);
  if (!result.ok) {
    return { ok: false, message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message };
  }
  revalidatePath('/settings/notifications');
  return { ok: true, message: 'Notification settings saved.', settings: result.data };
}
