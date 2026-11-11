import type { DataResult } from '../source';

export type NotifyChannel = 'sms' | 'email' | 'whatsapp';

/**
 * The shipment states that can send a buyer message. They are normalized shipment statuses, the same
 * values `MessageStats.byStatus` counts by, so the dashboard SMS tab and this screen agree.
 */
export type NotifyEvent = 'MANIFESTED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RTO_INITIATED';

export const NOTIFY_CHANNELS: readonly NotifyChannel[] = ['sms', 'email', 'whatsapp'];
export const NOTIFY_EVENTS: readonly NotifyEvent[] = [
  'MANIFESTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RTO_INITIATED',
];

export const CHANNEL_LABELS: Record<NotifyChannel, string> = {
  sms: 'SMS',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

export interface NotificationSettings {
  matrix: Record<NotifyEvent, Record<NotifyChannel, boolean>>;
  templates: Record<NotifyEvent, string>;
}

export interface NotificationService {
  get(): Promise<DataResult<NotificationSettings>>;
  save(s: NotificationSettings): Promise<DataResult<NotificationSettings>>;
}
