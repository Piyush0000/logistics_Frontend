import type { DataResult } from '../source';

export const DISCREPANCY_STATUSES = ['open', 'disputed', 'accepted', 'resolved'] as const;
export type DiscrepancyStatus = (typeof DISCREPANCY_STATUSES)[number];

export const WEIGHT_PAGE_SIZE = 10;

export interface WeightDiscrepancy {
  id: string;
  awb: string;
  carrier: string;
  declaredKg: number;
  chargedKg: number;
  /** What the courier added to the freight for the extra weight, in paise. */
  extraChargePaise: number;
  status: DiscrepancyStatus;
  /** When the courier raised it, as an ISO timestamp. */
  raisedAt: string;
  /** The last day the merchant can answer, as YYYY-MM-DD in Indian time. */
  respondBy: string;
}

/** Evidence is described by its metadata only. File contents are never sent or stored. */
export interface EvidenceFile {
  name: string;
  type: string;
  size: number;
}

export interface DisputeInput {
  id: string;
  note: string;
  evidence: EvidenceFile[];
}

export interface WeightSummary {
  open: number;
  disputed: number;
  /** Extra charges still waiting on an answer or a decision (open and disputed), in paise. */
  extraChargePaise: number;
}

export interface WeightPage {
  items: WeightDiscrepancy[];
  page: number;
  pageCount: number;
}

export interface WeightService {
  getSummary(): Promise<DataResult<WeightSummary>>;
  listDiscrepancies(query: {
    status?: DiscrepancyStatus;
    /** Part of an AWB, any case. */
    q?: string;
    page: number;
  }): Promise<DataResult<WeightPage>>;
  accept(id: string): Promise<DataResult<WeightDiscrepancy>>;
  dispute(input: DisputeInput): Promise<DataResult<WeightDiscrepancy>>;
}
