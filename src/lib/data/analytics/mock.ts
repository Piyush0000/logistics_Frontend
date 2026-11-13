import 'server-only';

import { addDays } from '../../format/calendar';
import { indianDay } from '../../format/date';
import { fromMock } from '../source';
import type { AnalyticsService, DailyPoint, Range } from './types';

// Thirty days of sample figures, oldest first. The 7-day view is the last seven of these.
const DELIVERED = [
  9, 12, 7, 0, 14, 11, 8, 13, 10, 6, 0, 15, 12, 9, 11, 14, 8, 5, 13, 10, 12, 16, 9, 7, 11, 13, 6, 14, 12, 10,
];
const FREIGHT_RUPEES = [
  4200, 5100, 3800, 0, 6400, 5900, 4700, 6100, 5200, 3300, 0, 7200, 6600, 4900, 5600, 7000, 4100, 2800,
  6300, 5400, 6800, 8100, 4800, 3900, 5700, 6500, 3400, 7400, 6200, 5300,
];
// One day collects ₹1,23,456, so the chart has to cope with a six-figure label.
const COD_RUPEES = [
  38000, 52000, 27500, 0, 61000, 48000, 35000, 123456, 44000, 21000, 0, 67000, 59000, 36500, 41000, 72000,
  30500, 18000, 56000, 43000, 64000, 88000, 33000, 25500, 47000, 58000, 22000, 69000, 54000, 40000,
];

/** The last `days` days ending today in Indian time, oldest first. */
function series(values: readonly number[], days: Range, scale = 1): DailyPoint[] {
  const today = indianDay(new Date());
  return values.slice(-days).map((value, index) => ({
    day: addDays(today, index - (days - 1)),
    value: value * scale,
  }));
}

export const mockAnalyticsService: AnalyticsService = {
  async deliveredByDay(days) {
    return fromMock(series(DELIVERED, days));
  },
  async revenueByDay(days) {
    return fromMock({
      freightPaise: series(FREIGHT_RUPEES, days, 100),
      codPaise: series(COD_RUPEES, days, 100),
    });
  },
};
