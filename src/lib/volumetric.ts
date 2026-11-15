/** Couriers charge on volume when a parcel is light for its size: L x W x H in cm, divided by this. */
export const VOLUMETRIC_DIVISOR = 5000;

export interface PackageDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

// Hundredths of a kilo are whole numbers, so each weight is rounded once and compared as an integer.
const HUNDREDTHS_PER_KG = 100;
const THOUSANDTHS_PER_CM3 = 1000;

function volumetricHundredths({ lengthCm, widthCm, heightCm }: PackageDimensions): number {
  // Thousandths of a cm3 are whole numbers, which drops float noise such as 1.1 x 1.1 x 1.1.
  const milliCm3 = Math.round(lengthCm * widthCm * heightCm * THOUSANDTHS_PER_CM3);
  return Math.round((milliCm3 * HUNDREDTHS_PER_KG) / (VOLUMETRIC_DIVISOR * THOUSANDTHS_PER_CM3));
}

/** L x W x H / 5000 in kg, to 2 decimals. */
export function volumetricWeightKg(dimensions: PackageDimensions): number {
  return volumetricHundredths(dimensions) / HUNDREDTHS_PER_KG;
}

/** What a courier bills: the larger of the real weight and the volumetric weight, to 2 decimals. */
export function chargeableWeightKg(actualKg: number, dimensions: PackageDimensions): number {
  // toPrecision drops the float noise in values such as 0.285 * 100, so a trailing 5 rounds up.
  const actual = Math.round(Number((actualKg * HUNDREDTHS_PER_KG).toPrecision(12)));
  return Math.max(actual, volumetricHundredths(dimensions)) / HUNDREDTHS_PER_KG;
}
