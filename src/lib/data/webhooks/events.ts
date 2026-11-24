/**
 * The events a merchant can subscribe to, and what each delivery's JSON body looks like. These
 * match services/webhooks (subscription.input.ts and deliveries/merchant-payload.ts).
 */
export const WEBHOOK_EVENTS = [
  {
    value: 'shipment.created',
    description: 'The courier accepted the booking and the shipment has its courier AWB.',
  },
  {
    value: 'shipment.status.updated',
    description: 'The shipment moved to a new status, for example picked up, out for delivery or delivered.',
  },
  {
    value: 'shipment.failed',
    description: 'The courier refused the booking. The reason says why and whether trying again can work.',
  },
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number]['value'];

/** The headers on every delivery. */
export const WEBHOOK_HEADERS = [
  { name: 'X-Evoc-Signature', note: 'sha256= followed by the HMAC-SHA256 signature.' },
  { name: 'X-Evoc-Timestamp', note: 'When this attempt was signed, in Unix seconds.' },
  { name: 'X-Evoc-Event-Id', note: 'Stays the same on every retry, so you can skip repeats.' },
] as const;

/** Waits between attempts after a failure: 1 min, 5 min, 30 min, 2 h, then 12 h. */
export const WEBHOOK_RETRY_SCHEDULE = ['1 minute', '5 minutes', '30 minutes', '2 hours', '12 hours'] as const;

const SHIPMENT = {
  shipment_id: '3f6c1a52-8e1b-4c7d-9a2e-5b4f0c9d8e71',
  awb: 'EVS8516979039',
  reference_id: 'ORD-1042',
};

const EVENT_DATA: Record<WebhookEventName, Record<string, unknown>> = {
  'shipment.created': { ...SHIPMENT, status: 'CREATED', estimated_delivery_date: null },
  'shipment.status.updated': {
    ...SHIPMENT,
    status: 'OUT_FOR_DELIVERY',
    location: 'Mumbai Hub',
    status_at: '2026-11-24T09:58:00.000Z',
  },
  'shipment.failed': {
    ...SHIPMENT,
    status: 'FAILED',
    reason: 'Pincode not serviceable',
    reason_code: 'NOT_SERVICEABLE',
    retryable: false,
  },
};

/** An example delivery body. Values are examples; the shape is exact. */
export function samplePayload(event: WebhookEventName) {
  return {
    id: '9b1d4c2e-7f3a-4e8b-a6d5-2c0e1f4b3a97',
    type: event,
    created_at: '2026-11-24T10:00:00.000Z',
    data: EVENT_DATA[event],
  };
}
