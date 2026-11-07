import { resolveDataSource } from '../source';
import { gatewayWebhookService } from './gateway';
import { mockWebhookService } from './mock';
import type { WebhookService } from './types';

export type {
  ActionResult,
  DeliveryStatus,
  Webhook,
  WebhookDelivery,
  WebhookDeliveryPage,
  WebhookFieldErrors,
  WebhookInput,
} from './types';

export function webhookService(): WebhookService {
  return resolveDataSource('webhooks') === 'gateway' ? gatewayWebhookService : mockWebhookService();
}
