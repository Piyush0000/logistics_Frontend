import { z } from 'zod';
import { WEBHOOK_EVENTS } from './events';
import type { WebhookFieldErrors, WebhookInput } from './types';

const URL_ERROR = 'Enter a public HTTPS address, such as https://your-app.com/webhooks.';
const EVENTS_ERROR = 'Choose at least one event.';

const KNOWN_EVENTS = new Set<string>(WEBHOOK_EVENTS.map(({ value }) => value));
const IP_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;

function isPublicHttps(value: string): boolean {
  if (value.length > 2048 || !URL.canParse(value)) return false;
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.hash &&
    !hostname.startsWith('[') &&
    !IP_ADDRESS.test(hostname) &&
    hostname !== 'localhost' &&
    !hostname.endsWith('.localhost') &&
    !hostname.endsWith('.local') &&
    !hostname.endsWith('.internal')
  );
}

// The same rules as services/webhooks/src/subscriptions/subscription.input.ts, so problems
// appear beside the field. The backend still checks everything itself.
const WebhookInputSchema = z.object({
  url: z.string({ message: URL_ERROR }).trim().refine(isPublicHttps, URL_ERROR),
  events: z
    .array(z.string(), { message: EVENTS_ERROR })
    .min(1, EVENTS_ERROR)
    .refine((events) => events.every((event) => KNOWN_EVENTS.has(event)), EVENTS_ERROR)
    .refine((events) => new Set(events).size === events.length, EVENTS_ERROR),
});

export function parseWebhookInput(
  input: unknown,
):
  | { ok: true; data: WebhookInput }
  | { ok: false; fieldErrors: WebhookFieldErrors } {
  const parsed = WebhookInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: WebhookFieldErrors = {};
  for (const issue of parsed.error.issues) {
    if (issue.path[0] === 'url') fieldErrors.url = issue.message;
    if (issue.path[0] === 'events') fieldErrors.events = issue.message;
  }
  // Input that is not even an object has no field to point at.
  return { ok: false, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : { url: URL_ERROR } };
}
