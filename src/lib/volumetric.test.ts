import { describe, expect, it } from 'vitest';
import { chargeableWeightKg, VOLUMETRIC_DIVISOR, volumetricWeightKg } from './volumetric';

const box = (lengthCm: number, widthCm: number, heightCm: number) => ({ lengthCm, widthCm, heightCm });

describe('volumetricWeightKg', () => {
  it('uses a divisor of 5000', () => {
    expect(VOLUMETRIC_DIVISOR).toBe(5000);
  });

  it('volumetric weight of 30×20×10 cm is 1.2 kg', () => {
    expect(volumetricWeightKg(box(30, 20, 10))).toBe(1.2);
  });

  it('rounds to 2 decimals without floating-point drift', () => {
    // 33 x 33 x 33 = 35937 cm3, which is 7.1874 kg.
    expect(volumetricWeightKg(box(33, 33, 33))).toBe(7.19);
    // 1.1 x 1.1 x 1.1 is 1.3310000000000004 in floating point: 0.00026 kg, so 0.
    expect(volumetricWeightKg(box(1.1, 1.1, 1.1))).toBe(0);
    // 25 cm3 is exactly 0.005 kg, which rounds up to 0.01.
    expect(volumetricWeightKg(box(5, 5, 1))).toBe(0.01);
    // 75 cm3 is exactly 0.015 kg, which rounds up to 0.02.
    expect(volumetricWeightKg(box(5, 5, 3))).toBe(0.02);
    // 500 x 500 x 500 is the largest box and must stay exact.
    expect(volumetricWeightKg(box(500, 500, 500))).toBe(25_000);
  });
});

describe('chargeableWeightKg', () => {
  it('is the larger of actual and volumetric', () => {
    // A light, bulky box is charged on its volume.
    expect(chargeableWeightKg(0.5, box(30, 20, 10))).toBe(1.2);
    // A small, heavy box is charged on its real weight.
    expect(chargeableWeightKg(3, box(30, 20, 10))).toBe(3);
  });

  it('is that weight when both are equal', () => {
    expect(chargeableWeightKg(1.2, box(30, 20, 10))).toBe(1.2);
  });

  it('rounds a real weight ending in 5 half up, without drift', () => {
    const tiny = box(1, 1, 1);
    // 0.285 * 100 is 28.499999999999996 in floating point.
    expect(chargeableWeightKg(0.285, tiny)).toBe(0.29);
    expect(chargeableWeightKg(1.005, tiny)).toBe(1.01);
  });
});
