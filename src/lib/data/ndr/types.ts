import type { DataResult } from '../source';

export interface NdrHistoryItem {
  action: string;
  timestamp: string;
  note?: string;
}

export type NdrStatus = 'ACTION_REQUIRED' | 'REATTEMPT_REQUESTED' | 'RTO_REQUESTED' | 'DELIVERED';

export interface NdrRecord {
  id: string;
  shipment_id: string;
  awb: string;
  reference_id: string;
  carrier: string;
  recipient_name: string;
  recipient_phone: string;
  destination_city: string;
  attempt_count: number;
  last_attempt_at: string;
  reason: string;
  raw_status?: string;
  status: NdrStatus;
  history: NdrHistoryItem[];
}

export interface NdrDashboardData {
  kpis: {
    openNdr: number;
    reattempted: number;
    delivered: number;
    returned: number;
  };
  items: NdrRecord[];
}

export interface NdrActionInput {
  ndr_id: string;
  action: 'REATTEMPT' | 'RTO';
  instructions?: string;
  preferred_date?: string;
}

export interface NdrService {
  getNdrDashboard(): Promise<DataResult<NdrDashboardData>>;
  takeNdrAction(input: NdrActionInput): Promise<DataResult<NdrRecord>>;
}

