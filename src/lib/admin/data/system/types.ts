import type { DataResult } from '../../../data/source';
import type { Page } from '../common';
import type { AuditFilters } from './audit-filters';

export type HealthStatus = 'up' | 'degraded' | 'down';

/** One backend service, as its health check reports it. */
export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  /** Null when the service did not answer in time: shown as "No answer". */
  latencyMs: number | null;
  /** ISO timestamp. */
  checkedAt: string;
  /** A courier connector in test mode: it answers, but makes no real courier calls. */
  testMode?: boolean;
}

/**
 * failed: the webhooks service gave up on this delivery. queued: an admin asked for a retry and it
 * waits for the next send.
 */
export type WebhookFailureStatus = 'failed' | 'queued';

/** A webhook delivery to a merchant that failed, as the webhooks service's support route lists it. */
export interface WebhookFailure {
  id: string;
  merchantId: string;
  merchantName: string;
  /** The event, for example 'shipment.status.updated'. */
  topic: string;
  targetUrl: string;
  attempts: number;
  lastHttpStatus: number | null;
  lastError: string;
  /** ISO timestamp of the last attempt. */
  lastAttemptAt: string;
  status: WebhookFailureStatus;
  subscriptionStatus: 'active' | 'paused' | 'deleted';
}

/** What a caller passes to recordAudit(). */
export interface AuditInput {
  /** A short verb phrase, for example 'Wallet credit' or 'Suspended merchant'. */
  action: string;
  /** What it was done to, for example 'mer_002 · Neelgiri Teas' or 'ekart · zone C'. */
  target: string;
  /** One line on why or what changed. */
  detail: string;
}

/** A change the admin made, kept for the record. */
export interface AuditEntry extends AuditInput {
  id: string;
  /** ISO timestamp. */
  at: string;
}

export interface AuditLog {
  page: Page<AuditEntry>;
  /** Every action in the log, once each, for the filter. */
  actions: string[];
  /** The filters actually used: an action not in the log is dropped. */
  applied: AuditFilters;
}

export interface AdminSystemService {
  getHealth(): Promise<DataResult<ServiceHealth[]>>;
  listAuditLog(filters: AuditFilters): Promise<DataResult<AuditLog>>;
  recordAudit(entry: AuditInput): Promise<DataResult<undefined>>;
  /** Failed deliveries across every merchant, newest attempt first. */
  listWebhookFailures(): Promise<DataResult<WebhookFailure[]>>;
  /**
   * Mirrors the webhooks service's POST /deliveries/:id/retry: queues the delivery again. A conflict
   * error when it is already queued or its subscription is deleted; not_found for an unknown id.
   * Does not audit: the server action calls recordAudit() after it succeeds.
   */
  retryWebhookDelivery(id: string): Promise<DataResult<WebhookFailure>>;
}
