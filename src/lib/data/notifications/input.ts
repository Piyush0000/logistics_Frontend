import { z } from 'zod';
import { unknownVariables } from '../../templates';
import { NOTIFY_CHANNELS, NOTIFY_EVENTS, type NotificationSettings, type NotifyEvent } from './types';

export const MAX_TEMPLATE_LENGTH = 480;

const template = z
  .string({ message: 'Enter a message.' })
  .trim()
  .min(1, 'Enter a message.')
  .max(MAX_TEMPLATE_LENGTH, `Message must be at most ${MAX_TEMPLATE_LENGTH} characters.`)
  .superRefine((text, ctx) => {
    const [first] = unknownVariables(text);
    if (first) ctx.addIssue({ code: 'custom', message: unknownVariableMessage(first) });
  });

export const unknownVariableMessage = (variable: string) => `Unknown variable: ${variable}`;

const channels = z.object(Object.fromEntries(NOTIFY_CHANNELS.map((c) => [c, z.boolean()])));
const SettingsSchema = z.object({
  matrix: z.object(Object.fromEntries(NOTIFY_EVENTS.map((e) => [e, channels]))),
  templates: z.object(Object.fromEntries(NOTIFY_EVENTS.map((e) => [e, template]))),
});

export type NotificationFieldErrors = Partial<Record<NotifyEvent, string>>;

export type NotificationParse =
  | { ok: true; value: NotificationSettings }
  | { ok: false; message: string; errors: NotificationFieldErrors };

/**
 * Checks the settings on the server. Every event and channel must be present, and a message may only
 * use the allowed variables. Unknown keys are dropped.
 */
export function parseNotificationInput(input: unknown): NotificationParse {
  const parsed = SettingsSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data as NotificationSettings };

  const errors: NotificationFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const [section, event] = issue.path;
    if (section === 'templates' && NOTIFY_EVENTS.includes(event as NotifyEvent)) {
      errors[event as NotifyEvent] ??= issue.message;
    }
  }
  const message = Object.values(errors)[0] ?? 'Check the settings, then try again.';
  return { ok: false, message, errors };
}
