import { parseEnum } from '../../url-params';
import type { DailyPoint, Range } from './types';

/** The sum of the points. NaN, infinite and negative values count as zero. */
export function sumPoints(points: readonly DailyPoint[]): number {
  return points.reduce((sum, { value }) => (Number.isFinite(value) && value > 0 ? sum + value : sum), 0);
}

/** `?range=` as 7 or 30 days, else 7. */
export function parseRange(value: unknown): Range {
  return parseEnum(value, ['7', '30'] as const) === '30' ? 30 : 7;
}
