import { z } from 'zod';
import { unknownVariables } from '../../templates';
import {
  NOTIFY_CHANNELS,
  NOTIFY_EVENTS,
  type NotificationSettings,
  type NotifyChannel,
  type NotifyEvent,
} from './types';

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

/** Only what the merchant changed: per event, some channel switches and/or the message. */
export interface NotificationChanges {
  events: Partial<
    Record<NotifyEvent, { matrix?: Partial<Record<NotifyChannel, boolean>>; template?: string }>
  >;
}

const ChangesSchema = z.object({
  events: z.object(
    Object.fromEntries(
      NOTIFY_EVENTS.map((e) => [
        e,
        z
          .object({
            matrix: z.object(Object.fromEntries(NOTIFY_CHANNELS.map((c) => [c, z.boolean().optional()]))).optional(),
            template: z.string().optional(),
          })
          .optional(),
      ]),
    ),
  ),
});

export type ChangesParse = { ok: true; value: NotificationChanges } | { ok: false; message: string };

/** Checks the shape of a change. The messages themselves are checked after the change is applied. */
export function parseNotificationChanges(input: unknown): ChangesParse {
  const parsed = ChangesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the settings, then try again.' };
  return { ok: true, value: parsed.data as NotificationChanges };
}

/** Puts the changed events on top of the current settings and leaves every other event as it is. */
export function applyNotificationChanges(
  current: NotificationSettings,
  changes: NotificationChanges,
): NotificationSettings {
  const next = structuredClone(current);
  for (const event of NOTIFY_EVENTS) {
    const change = changes.events[event];
    if (!change) continue;
    for (const channel of NOTIFY_CHANNELS) {
      const on = change.matrix?.[channel];
      if (on !== undefined) next.matrix[event][channel] = on;
    }
    if (change.template !== undefined) next.templates[event] = change.template;
  }
  return next;
}

/** What differs between two settings, so a save sends only that. */
export function diffNotificationSettings(
  base: NotificationSettings,
  now: NotificationSettings,
): NotificationChanges {
  const events: NotificationChanges['events'] = {};
  for (const event of NOTIFY_EVENTS) {
    const change: NonNullable<NotificationChanges['events'][NotifyEvent]> = {};
    for (const channel of NOTIFY_CHANNELS) {
      if (base.matrix[event][channel] !== now.matrix[event][channel]) {
        (change.matrix ??= {})[channel] = now.matrix[event][channel];
      }
    }
    if (base.templates[event] !== now.templates[event]) change.template = now.templates[event];
    if (change.matrix || change.template !== undefined) events[event] = change;
  }
  return { events };
}
