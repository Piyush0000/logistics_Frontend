import type { DataResult } from '../source';
import type { Range } from '../analytics/types';

/** WhatsApp updates to buyers over a range: what went out, what was skipped and why, and the cost. */
export interface MessageStats {
  sent: number;
  skipped: number;
  failed: number;
  chargedPaise: number;
  /** Sent messages per shipment event. */
  byStatus: { status: string; count: number }[];
  /** Why messages were skipped or failed, most common first. */
  reasons: { reason: string; count: number }[];
}

export interface MessagesService {
  getStats(days: Range): Promise<DataResult<MessageStats>>;
}
