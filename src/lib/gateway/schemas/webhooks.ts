import { z } from 'zod';

/** One entry from GET /api/v1/webhooks. Deleted subscriptions are never listed. */
export const WebhookSubscriptionSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  status: z.enum(['ACTIVE', 'PAUSED']),
  failure_started_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const WebhookListSchema = z.array(WebhookSubscriptionSchema);

/** POST /api/v1/webhooks. This is the only response that includes the signing secret. */
export const CreatedWebhookSchema = WebhookSubscriptionSchema.extend({ secret: z.string() });

/** GET /api/v1/webhooks/deliveries. */
export const WebhookDeliveryPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      event_id: z.string(),
      topic: z.string(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'DELIVERED', 'FAILED']),
      target_url: z.string(),
      attempt_count: z.number().int().nonnegative(),
      next_attempt_at: z.string().nullable(),
      created_at: z.string(),
      subscription_status: z.enum(['ACTIVE', 'PAUSED', 'DELETED']),
      last_attempt: z
        .object({
          started_at: z.string(),
          http_status: z.number().int().nullable(),
          outcome: z.string(),
          error: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  next_cursor: z.string().nullable(),
});

export type WebhookSubscriptionBody = z.output<typeof WebhookSubscriptionSchema>;
export type WebhookDeliveryPageBody = z.output<typeof WebhookDeliveryPageSchema>;
