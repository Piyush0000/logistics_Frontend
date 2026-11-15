import type { DataResult } from '../source';
import type { Range } from '../analytics/types';

/** Buyer text messages in a period. `byStatus` counts messages by the shipment status that sent them. */
export interface MessageStats {
  sent: number;
  delivered: number;
  failed: number;
  byStatus: { status: string; count: number }[];
}

export interface MessagesService {
  getStats(days: Range): Promise<DataResult<MessageStats>>;
}
