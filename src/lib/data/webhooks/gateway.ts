import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import {
  CreatedWebhookSchema,
  WebhookDeliveryPageSchema,
  WebhookListSchema,
  WebhookSubscriptionSchema,
  type WebhookDeliveryPageBody,
  type WebhookSubscriptionBody,
} from '../../gateway/schemas/webhooks';
import { fromGateway, type DataResult } from '../source';
import type {
  Webhook,
  WebhookDeliveryPage,
  WebhookInput,
  WebhookService,
} from './types';

const BASE_PATH = '/api/v1/webhooks';

export const DELIVERY_LIMIT = 10;

const toWebhook = (body: WebhookSubscriptionBody): Webhook => ({
  id: body.id,
  url: body.url,
  events: body.events,
  status: body.status,
  failureStartedAt: body.failure_started_at,
  createdAt: body.created_at,
  updatedAt: body.updated_at,
});

const toDeliveryPage = (body: WebhookDeliveryPageBody): WebhookDeliveryPage => ({
  nextCursor: body.next_cursor,
  items: body.items.map((item) => ({
    id: item.id,
    topic: item.topic,
    status: item.status,
    targetUrl: item.target_url,
    attemptCount: item.attempt_count,
    nextAttemptAt: item.next_attempt_at,
    createdAt: item.created_at,
    subscriptionStatus: item.subscription_status,
    lastAttempt: item.last_attempt && {
      startedAt: item.last_attempt.started_at,
      httpStatus: item.last_attempt.http_status,
      outcome: item.last_attempt.outcome,
      error: item.last_attempt.error,
    },
  })),
});

const itemPath = (id: string) => `${BASE_PATH}/${encodeURIComponent(id)}`;

export async function fetchWebhooks(token: string | null): Promise<DataResult<Webhook[]>> {
  const result = await gatewayFetch(BASE_PATH, { schema: WebhookListSchema, token });
  return fromGateway(result.ok ? { ...result, data: result.data.map(toWebhook) } : result);
}

export async function createWebhook(
  input: WebhookInput,
  token: string | null,
): Promise<DataResult<Webhook & { secret: string }>> {
  const result = await gatewayFetch(BASE_PATH, {
    method: 'POST',
    body: input,
    schema: CreatedWebhookSchema,
    token,
  });
  return fromGateway(
    result.ok
      ? { ...result, data: { ...toWebhook(result.data), secret: result.data.secret } }
      : result,
  );
}

export async function updateWebhook(
  id: string,
  input: WebhookInput,
  token: string | null,
): Promise<DataResult<Webhook>> {
  const result = await gatewayFetch(itemPath(id), {
    method: 'PATCH',
    body: input,
    schema: WebhookSubscriptionSchema,
    token,
  });
  return fromGateway(result.ok ? { ...result, data: toWebhook(result.data) } : result);
}

export async function deleteWebhook(
  id: string,
  token: string | null,
): Promise<DataResult<undefined>> {
  return fromGateway(await gatewayFetch(itemPath(id), { method: 'DELETE', token }));
}

export async function fetchDeliveries(
  cursor: string | undefined,
  token: string | null,
): Promise<DataResult<WebhookDeliveryPage>> {
  const result = await gatewayFetch(`${BASE_PATH}/deliveries`, {
    query: { limit: DELIVERY_LIMIT, cursor },
    schema: WebhookDeliveryPageSchema,
    token,
  });
  return fromGateway(result.ok ? { ...result, data: toDeliveryPage(result.data) } : result);
}

export async function retryDeliveryRequest(
  id: string,
  token: string | null,
): Promise<DataResult<undefined>> {
  return fromGateway(
    await gatewayFetch(`${BASE_PATH}/deliveries/${encodeURIComponent(id)}/retry/merchant`, {
      method: 'POST',
      token,
    }),
  );
}

const credential = () => merchantCredential('webhooks');

export const gatewayWebhookService: WebhookService = {
  async list() {
    return fetchWebhooks(await credential());
  },
  async create(input) {
    return createWebhook(input, await credential());
  },
  async update(id, input) {
    return updateWebhook(id, input, await credential());
  },
  async remove(id) {
    return deleteWebhook(id, await credential());
  },
  async listDeliveries(cursor) {
    return fetchDeliveries(cursor, await credential());
  },
  async retryDelivery(id) {
    return retryDeliveryRequest(id, await credential());
  },
};
