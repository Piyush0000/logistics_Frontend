import type { DataResult } from '../../../data/source';
import type { Page } from '../common';
import type { AuditFilters } from './audit-filters';

export type HealthStatus = 'up' | 'degraded' | 'down';

/** One backend service, as its health check reports it. */
export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  latencyMs: number | null;
  /** ISO timestamp. */
  checkedAt: string;
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
  // Planned (Teammate 2): webhook delivery failures with retry.
}
