import type { DataResult } from '../source';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED';
  failureStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED';

export interface WebhookDelivery {
  id: string;
  topic: string;
  status: DeliveryStatus;
  targetUrl: string;
  attemptCount: number;
  nextAttemptAt: string | null;
  createdAt: string;
  subscriptionStatus: 'ACTIVE' | 'PAUSED' | 'DELETED';
  lastAttempt: {
    startedAt: string;
    httpStatus: number | null;
    outcome: string;
    error: string | null;
  } | null;
}

export interface WebhookDeliveryPage {
  items: WebhookDelivery[];
  nextCursor: string | null;
}

export interface WebhookInput {
  url: string;
  events: string[];
}

export interface WebhookFieldErrors {
  url?: string;
  events?: string;
}

/** What a server action tells the form. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: WebhookFieldErrors };

export interface WebhookService {
  list(): Promise<DataResult<Webhook[]>>;
  /** The signing secret appears here and nowhere else. */
  create(input: WebhookInput): Promise<DataResult<Webhook & { secret: string }>>;
  update(id: string, input: WebhookInput): Promise<DataResult<Webhook>>;
  remove(id: string): Promise<DataResult<undefined>>;
  listDeliveries(cursor?: string): Promise<DataResult<WebhookDeliveryPage>>;
  retryDelivery(id: string): Promise<DataResult<undefined>>;
}
