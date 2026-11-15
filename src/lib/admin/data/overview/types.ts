import type { DataResult } from '../../../data/source';

export type AttentionTone = 'warning' | 'error' | 'info';

/** Something on the platform that needs the admin, linking to where it can be handled. */
export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: AttentionTone;
}

/** Platform-wide figures across every merchant. Money is in paise. */
export interface PlatformOverview {
  merchants: { total: number; active: number; pendingKyc: number; suspended: number };
  shipments: { today: number; inTransit: number; delivered30d: number; rto30d: number; stuck: number };
  money: { walletFloatPaise: number; codOutstandingPaise: number; revenue30dPaise: number };
  /** Shipments booked per day for the last 14 days, oldest first. `date` is YYYY-MM-DD. */
  shipmentsByDay: { date: string; count: number }[];
  /** Shipments by stage right now, for the pipeline bar. */
  pipeline: { toProcess: number; inTransit: number; outForDelivery: number; returning: number };
  attention: AttentionItem[];
}

export interface AdminOverviewService {
  getOverview(): Promise<DataResult<PlatformOverview>>;
}
