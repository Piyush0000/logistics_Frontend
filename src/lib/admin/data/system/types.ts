import type { DataResult } from '../../../data/source';

export type HealthStatus = 'up' | 'degraded' | 'down';

/** One backend service, as its health check reports it. */
export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  latencyMs: number | null;
  /** ISO timestamp. */
  checkedAt: string;
}

/** A change the admin made, kept for the record. */
export interface AuditEntry {
  id: string;
  /** ISO timestamp. */
  at: string;
  action: string;
  target: string;
  detail: string;
}

export interface AdminSystemService {
  getHealth(): Promise<DataResult<ServiceHealth[]>>;
  listAuditLog(): Promise<DataResult<AuditEntry[]>>;
  // Planned (Teammate 2): webhook delivery failures with retry; write an audit entry on every admin action.
}
