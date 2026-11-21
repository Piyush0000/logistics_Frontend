import 'server-only';

import { z } from 'zod';
import { notAvailable } from '../../../data/not-available';
import { fromGateway } from '../../../data/source';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken } from '../admin-fetch';
import type { AdminSystemService } from './types';

/** Health answers should be quick; a slower gateway counts as not answering. */
export const HEALTH_TIMEOUT_MS = 3000;

// The shape asked for in docs/admin/backend-needs.md: one entry per service, null latency when a
// service did not answer the gateway in time.
const healthSchema = z.object({
  services: z.array(
    z.object({
      service: z.string(),
      status: z.enum(['up', 'degraded', 'down']),
      latencyMs: z.number().nonnegative().nullable(),
      checkedAt: z.string(),
    }),
  ),
});

// Health calls GET /api/v1/admin/health with the admin key.
// Webhook failures and the audit log have no admin route yet, so they show as not available.
export const gatewayAdminSystemService: AdminSystemService = {
  async getHealth() {
    const result = await gatewayFetch('/api/v1/admin/health', {
      schema: healthSchema,
      token: adminToken(),
      timeoutMs: HEALTH_TIMEOUT_MS,
    });
    return fromGateway(result.ok ? { ...result, data: result.data.services } : result);
  },
  listAuditLog: notAvailable,
  recordAudit: notAvailable,
  listWebhookFailures: notAvailable,
  retryWebhookDelivery: notAvailable,
};
