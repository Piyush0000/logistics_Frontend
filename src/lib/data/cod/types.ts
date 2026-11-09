import type { DataResult } from '../source';
import type { CodFilters } from './filters';

export type CodStatus = 'pending' | 'settled';

export interface CodRemittance {
  id: string;
  orderNumber: string;
  awb: string;
  courier: string;
  codPaise: number;
  deductionsPaise: number;
  remittablePaise: number;
  status: CodStatus;
  collectedAt: string;
  settledAt: string | null;
}

export interface CodSummary {
  remittedTillDatePaise: number;
  settledCount: number;
  lastRemittancePaise: number;
  nextBatchPaise: number;
  nextBatchCount: number;
  totalDuePaise: number;
  dueCount: number;
}

export interface CodRemittancePage {
  entries: CodRemittance[];
  page: number;
  pageCount: number;
  /** Position of the first and last rows shown, counting from 1. Zero when there are none. */
  first: number;
  last: number;
  total: number;
}

export interface CodService {
  getSummary(): Promise<DataResult<CodSummary>>;
  listRemittances(filters: CodFilters): Promise<DataResult<CodRemittancePage>>;
  /** Every row matching the filters, ignoring the page. */
  exportRemittances(filters: CodFilters): Promise<DataResult<CodRemittance[]>>;
}
