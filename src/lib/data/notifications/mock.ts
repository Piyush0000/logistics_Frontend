import { fromMock, type DataResult } from '../source';
import { parseNotificationInput } from './input';
import type { NotificationService, NotificationSettings } from './types';

const SAMPLE: NotificationSettings = {
  matrix: {
    MANIFESTED: { sms: false, email: true, whatsapp: false },
    IN_TRANSIT: { sms: true, email: false, whatsapp: false },
    OUT_FOR_DELIVERY: { sms: true, email: true, whatsapp: false },
    DELIVERED: { sms: true, email: true, whatsapp: false },
    RTO_INITIATED: { sms: false, email: true, whatsapp: false },
  },
  templates: {
    MANIFESTED: 'Hi {{buyer_name}}, {{store_name}} has packed your order. Track it with {{courier}}: {{tracking_link}}',
    IN_TRANSIT: 'Hi {{buyer_name}}, your parcel {{awb}} from {{store_name}} is on its way with {{courier}}. Track it: {{tracking_link}}',
    OUT_FOR_DELIVERY: 'Hi {{buyer_name}}, your parcel {{awb}} is out for delivery today. Track it: {{tracking_link}}',
    DELIVERED: 'Hi {{buyer_name}}, your parcel {{awb}} from {{store_name}} was delivered. Thank you for your order.',
    RTO_INITIATED: 'Hi {{buyer_name}}, your parcel {{awb}} from {{store_name}} is being returned to the seller. Contact {{store_name}} for help.',
  },
};

/** Settings kept in memory. The shared instance is what the app uses; tests make their own. */
export function createMockNotificationService(): NotificationService {
  let settings: NotificationSettings = structuredClone(SAMPLE);

  return {
    async get() {
      return fromMock(structuredClone(settings));
    },

    async save(next) {
      // The server action checks this too. It is repeated so no caller can store a bad message.
      const parsed = parseNotificationInput(next);
      if (!parsed.ok) {
        const failure: DataResult<NotificationSettings> = {
          ok: false,
          source: 'mock',
          error: { kind: 'validation', status: 400, message: parsed.message },
        };
        return failure;
      }
      settings = structuredClone(parsed.value);
      return fromMock(structuredClone(settings));
    },
  };
}

export const mockNotificationService: NotificationService = createMockNotificationService();
