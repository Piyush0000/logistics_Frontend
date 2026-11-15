import type { B2bBox } from './types';

/** The weight of every box together, summing weight times count. */
export function totalWeightKg(boxes: readonly B2bBox[]): number {
  // Whole grams, so 0.1 kg three times is 0.3 kg and not 0.30000000000000004.
  const grams = boxes.reduce((sum, box) => sum + Math.round(box.weightKg * 1000) * box.count, 0);
  return grams / 1000;
}
