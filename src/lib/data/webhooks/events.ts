/** The events a merchant can subscribe to, from services/webhooks/src/subscriptions. */
export const WEBHOOK_EVENTS = [
  {
    value: 'shipment.created',
    description: 'A shipment was booked with a carrier.',
  },
  {
    value: 'shipment.status.updated',
    description: 'A shipment moved to a new status.',
  },
  {
    value: 'shipment.failed',
    description: 'A shipment could not be booked.',
  },
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number]['value'];

const EVENT_DATA: Record<WebhookEventName, Record<string, string>> = {
  'shipment.created': {
    awb: 'DEMOAWB480000',
    label_url: 'https://example.com/labels/DEMOAWB480000.pdf',
  },
  'shipment.status.updated': {
    awb: 'DEMOAWB480000',
    status: 'IN_TRANSIT',
  },
  'shipment.failed': {
    reason_code: 'DEMO_CARRIER_REJECTED',
  },
};

/** An example in the format of WebhookEventV1 in @logicore/contracts. */
export function samplePayload(event: WebhookEventName) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    event_id: '00000000-0000-4000-8000-000000000001',
    type: event,
    created_at: '2026-10-29T10:30:00.000Z',
    api_version: '2026-10-01',
    merchant_id: 'DEMO-MERCHANT',
    data: {
      order_id: '00000000-0000-4000-8000-000000000002',
      carrier: 'delhivery',
      ...EVENT_DATA[event],
      updated_at: '2026-10-29T10:30:00.000Z',
    },
  };
}
