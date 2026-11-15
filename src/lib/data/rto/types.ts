import type { OrderListResult } from '../orders';
import type { DataResult } from '../source';

export interface RtoSummary {
  inProgress: number;
  delivered: number;
  /** Null when the data source has no figure for RTO charges. */
  rtoChargesPaise: number | null;
}

export type RtoStage = 'in_progress' | 'delivered';

export const RTO_STAGES: readonly RtoStage[] = ['in_progress', 'delivered'];

/** The normalized shipment status each stage lists. */
export const RTO_STAGE_STATUS = {
  in_progress: 'RTO_INITIATED',
  delivered: 'RTO_DELIVERED',
} as const satisfies Record<RtoStage, string>;

export const RTO_PAGE_SIZE = 50;

export interface RtoService {
  getSummary(): Promise<DataResult<RtoSummary>>;
  listRto(query: { stage: RtoStage; page: number }): Promise<DataResult<OrderListResult>>;
}
