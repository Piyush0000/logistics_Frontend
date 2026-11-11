import type { DataResult } from '../source';

/** `day` is YYYY-MM-DD in Indian time. */
export interface DailyPoint {
  day: string;
  value: number;
}

export type Range = 7 | 30;

export interface AnalyticsService {
  deliveredByDay(days: Range): Promise<DataResult<DailyPoint[]>>;
  revenueByDay(
    days: Range,
  ): Promise<DataResult<{ freightPaise: DailyPoint[]; codPaise: DailyPoint[] }>>;
}
