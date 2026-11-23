import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import { NOTIFY_CHANNELS, NOTIFY_EVENTS, type NotificationService, type NotificationSettings } from './types';

const row = z.object(Object.fromEntries(NOTIFY_CHANNELS.map((c) => [c, z.boolean()])) as Record<string, z.ZodBoolean>);
const schema = z.object({
  matrix: z.object(Object.fromEntries(NOTIFY_EVENTS.map((e) => [e, row])) as Record<string, typeof row>),
  templates: z.object(Object.fromEntries(NOTIFY_EVENTS.map((e) => [e, z.string()])) as Record<string, z.ZodString>),
});

/** Customer notification choices from /api/v1/settings/notifications. */
export const gatewayNotificationService: NotificationService = {
  async get() {
    const result = await gatewayFetch('/api/v1/settings/notifications', {
      schema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: result.data as NotificationSettings } : result);
  },
  async save(settings) {
    const result = await gatewayFetch('/api/v1/settings/notifications', {
      method: 'PUT',
      schema,
      token: await merchantCredential('shipments'),
      body: settings,
    });
    return fromGateway(result.ok ? { ...result, data: result.data as NotificationSettings } : result);
  },
};
