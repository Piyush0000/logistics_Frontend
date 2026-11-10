import type { Zone } from './types';

// Mirrors resolveZone in the backend's order-engine, which decides the zone from the two pincodes.
const METRO_PREFIXES = new Set(['11', '12', '20', '40', '41', '50', '56', '60', '70', '38']);

function stateCircle(pin: string): string {
  const p = parseInt(pin.slice(0, 2), 10);
  if (p === 11) return 'DL';
  if (p >= 12 && p <= 13) return 'HR';
  if (p >= 14 && p <= 16) return 'PB';
  if (p === 17) return 'HP';
  if (p >= 18 && p <= 19) return 'JK';
  if (p >= 20 && p <= 28) return 'UP';
  if (p >= 30 && p <= 34) return 'RJ';
  if (p >= 36 && p <= 39) return 'GJ';
  if (p >= 40 && p <= 44) return 'MH';
  if (p >= 45 && p <= 49) return 'MP';
  if (p >= 50 && p <= 53) return 'AP_TG';
  if (p >= 56 && p <= 59) return 'KA';
  if (p >= 60 && p <= 64) return 'TN';
  if (p >= 67 && p <= 69) return 'KL';
  if (p >= 70 && p <= 74) return 'WB';
  if (p >= 75 && p <= 77) return 'OR';
  if (p >= 78 && p <= 79) return 'NE';
  if (p >= 80 && p <= 85) return 'BR_JH';
  return pin.slice(0, 2);
}

/** The zone for a route: A same area, B same state, C metro to metro, D anywhere else. Zone E is never chosen. */
export function resolveZone(originPin: string, destinationPin: string): Zone {
  const o = originPin.replace(/\D/g, '');
  const d = destinationPin.replace(/\D/g, '');
  if (o.slice(0, 3) === d.slice(0, 3)) return 'A';
  if (stateCircle(o) === stateCircle(d)) return 'B';
  if (METRO_PREFIXES.has(o.slice(0, 2)) && METRO_PREFIXES.has(d.slice(0, 2))) return 'C';
  return 'D';
}

export interface PriceInputs {
  baseWeightKg: number;
  basePaise: number;
  additionalPer500gPaise: number;
  codFeePercent: number;
  minCodFeePaise: number;
}

/**
 * The base price covers the base weight, and each started 500 g above it adds the extra charge.
 * COD adds a percentage of the amount to collect, never less than the minimum fee.
 */
export function priceInPaise(rate: PriceInputs, chargeableKg: number, codAmountPaise?: number): number {
  // Grams are whole numbers, so the band count has no float noise.
  const aboveGrams = Math.round(chargeableKg * 1000) - Math.round(rate.baseWeightKg * 1000);
  const extraBands = aboveGrams > 0 ? Math.ceil(aboveGrams / 500) : 0;
  let total = rate.basePaise + extraBands * rate.additionalPer500gPaise;
  if (codAmountPaise !== undefined) {
    const percentFee = Math.ceil(Number(((codAmountPaise * rate.codFeePercent) / 100).toFixed(6)));
    total += Math.max(percentFee, rate.minCodFeePaise);
  }
  return total;
}

/** Cheapest first, with couriers that cannot ship this parcel last. Ties keep their order. */
export function sortQuotes<T extends { serviceable: boolean; chargePaise: number | null }>(quotes: T[]): T[] {
  return quotes
    .map((quote, index) => ({ quote, index }))
    .sort((a, b) => {
      if (a.quote.serviceable !== b.quote.serviceable) return a.quote.serviceable ? -1 : 1;
      const diff = (a.quote.chargePaise ?? 0) - (b.quote.chargePaise ?? 0);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ quote }) => quote);
}
