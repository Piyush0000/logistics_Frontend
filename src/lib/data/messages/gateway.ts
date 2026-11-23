import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { MessagesService } from './types';

const schema = z.object({
  sent: z.number(),
  skipped: z.number(),
  failed: z.number(),
  charged_paise: z.number(),
  by_event: z.array(z.object({ event: z.string(), count: z.number() })),
  skip_reasons: z.array(z.object({ reason: z.string(), count: z.number() })),
});

/** WhatsApp update counts from /api/v1/analytics/messages. */
export const gatewayMessagesService: MessagesService = {
  async getStats(days) {
    const result = await gatewayFetch('/api/v1/analytics/messages', {
      schema,
      token: await merchantCredential('shipments'),
      query: { days },
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              sent: result.data.sent,
              skipped: result.data.skipped,
              failed: result.data.failed,
              chargedPaise: result.data.charged_paise,
              byStatus: result.data.by_event.map((e) => ({ status: e.event, count: e.count })),
              reasons: result.data.skip_reasons,
            },
          }
        : result,
    );
  },
};
