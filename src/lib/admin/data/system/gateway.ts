import 'server-only';

import { z } from 'zod';
import { fromGateway } from '../../../data/source';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, gatewayError, mapResult } from '../admin-fetch';
import { ADMIN_PAGE_SIZE } from '../common';
import { getAdminSession } from '../../session';
import type { AdminSystemService, WebhookFailure } from './types';

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
      test_mode: z.boolean().optional(),
    }),
  ),
});

const failureSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  topic: z.string(),
  target_url: z.string(),
  attempts: z.number(),
  last_http_status: z.number().nullable(),
  last_error: z.string(),
  last_attempt_at: z.string(),
  status: z.enum(['failed', 'queued']),
  subscription_status: z.enum(['active', 'paused', 'deleted']),
});
const toFailure = (f: z.infer<typeof failureSchema>): WebhookFailure => ({
  id: f.id,
  merchantId: f.merchant_id,
  merchantName: f.merchant_name,
  topic: f.topic,
  targetUrl: f.target_url,
  attempts: f.attempts,
  lastHttpStatus: f.last_http_status,
  lastError: f.last_error,
  lastAttemptAt: f.last_attempt_at,
  status: f.status,
  subscriptionStatus: f.subscription_status,
});
const auditSchema = z.object({
  items: z.array(
    z.object({ id: z.string(), action: z.string(), target: z.string(), detail: z.string(), at: z.string() }),
  ),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  actions: z.array(z.string()),
});

// Health, the audit log and webhook failures, all through the admin API with the admin key.
export const gatewayAdminSystemService: AdminSystemService = {
  async getHealth() {
    const result = await gatewayFetch('/api/v1/admin/health', {
      schema: healthSchema,
      token: adminToken(),
      timeoutMs: HEALTH_TIMEOUT_MS,
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: result.data.services.map(({ test_mode, ...service }) => ({
              ...service,
              ...(test_mode ? { testMode: true } : {}),
            })),
          }
        : result,
    );
  },
  async listAuditLog(filters) {
    const result = await gatewayFetch('/api/v1/admin/audit', {
      schema: auditSchema,
      token: adminToken(),
      query: { page: filters.page, limit: ADMIN_PAGE_SIZE, from: filters.from || undefined, to: filters.to || undefined },
    });
    if (!result.ok) return gatewayError(result.error);
    // An action not in the log is dropped, as the page expects; the list is fetched again with it.
    const action = result.data.actions.includes(filters.action) ? filters.action : '';
    const data = action
      ? await gatewayFetch('/api/v1/admin/audit', {
          schema: auditSchema,
          token: adminToken(),
          query: { action, page: filters.page, limit: ADMIN_PAGE_SIZE, from: filters.from || undefined, to: filters.to || undefined },
        })
      : result;
    return mapResult(data, (d) => ({
      page: { items: d.items.map(({ id, action: a, target, detail, at }) => ({ id, action: a, target, detail, at })), page: d.page, pageSize: d.limit, total: d.total },
      actions: result.data.actions,
      applied: { ...filters, action },
    }));
  },

  /** Records who did it from the admin session; the server action has already done the change. */
  async recordAudit(entry) {
    const session = await getAdminSession();
    const result = await gatewayFetch('/api/v1/admin/audit', {
      method: 'POST',
      token: adminToken(),
      body: { actor: session?.email ?? 'admin', ...entry },
    });
    return mapResult(result, () => undefined);
  },

  async listWebhookFailures() {
    const result = await gatewayFetch('/api/v1/admin/webhooks/failures', {
      schema: z.object({ items: z.array(failureSchema) }),
      token: adminToken(),
    });
    return mapResult(result, ({ items }) => items.map(toFailure));
  },

  async retryWebhookDelivery(id) {
    const retried = await gatewayFetch(`/api/v1/admin/webhooks/failures/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      token: adminToken(),
    });
    if (!retried.ok) return gatewayError(retried.error);
    const list = await this.listWebhookFailures();
    if (!list.ok) return list;
    const failure = list.data.find((f) => f.id === id);
    return failure
      ? { ok: true, source: 'gateway', data: failure }
      : gatewayError({ kind: 'not_found', status: 404, message: 'Delivery not found.' });
  },
};
