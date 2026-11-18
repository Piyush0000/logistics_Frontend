/**
 * Rules for admin pricing changes. No server code, so popups can show the same limits; every server
 * action checks again. Money is integer paise.
 */

export const ZONES = ['A', 'B', 'C', 'D', 'E'] as const;
export type Zone = (typeof ZONES)[number];
export const CARRIERS = ['delhivery', 'ekart', 'bluedart', 'shadowfax', 'dhl'] as const;

/** What each zone means, matching order-engine resolveZone (Evoc_ships/services/order-engine/src/allocation/zone.ts). */
export const ZONE_MEANING: Record<Zone, { name: string; rule: string; backend: string }> = {
  A: { name: 'Within city', rule: 'Pickup and delivery PIN codes share the first 3 digits.', backend: 'within-city' },
  B: { name: 'Within state', rule: 'Same state postal circle, for example Mumbai (40) to Pune (41).', backend: 'within-state' },
  C: { name: 'Metro to metro', rule: 'Different states, both tier-1 metros: Delhi NCR, Mumbai, Pune, Hyderabad, Bengaluru, Chennai, Kolkata, Ahmedabad.', backend: 'metro-metro' },
  D: { name: 'Rest of India', rule: 'Everything else between states.', backend: 'rest-of-india' },
  E: { name: 'Special or remote', rule: 'North-east, Jammu and Kashmir, Andaman and Lakshadweep.', backend: 'not in resolveZone yet; priced as rest of India' },
};

export const MAX_PRICE_PAISE = 10_000 * 100;
export const MAX_COD_PERCENT = 10;
export const MAX_DISCOUNT_PERCENT = 50;

export const PRICE_MESSAGE = 'Enter rupees above ₹0 and at most ₹10,000, with up to 2 decimals.';
export const COD_MINIMUM_MESSAGE = 'Enter rupees from ₹0 to ₹10,000, with up to 2 decimals.';
export const COD_PERCENT_MESSAGE = 'Enter a percent from 0 to 10, with up to 2 decimals.';
export const DISCOUNT_MESSAGE = 'Enter a discount above 0% and at most 50%, with up to 2 decimals.';
export const REASON_MESSAGE = 'Give a reason of 5 to 300 characters.';

/** Rupees ("1,250.5") to paise, or null when not a plain amount with at most 2 decimals. */
export function rupeesToPaise(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [rupees, fraction = ''] = cleaned.split('.');
  return Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
}

/** A percent with at most 2 decimals, as a number, or null. */
export function parsePercent(text: string): number | null {
  const cleaned = text.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export const isPrice = (paise: unknown): paise is number =>
  typeof paise === 'number' && Number.isSafeInteger(paise) && paise > 0 && paise <= MAX_PRICE_PAISE;
export const isCodMinimum = (paise: unknown): paise is number =>
  typeof paise === 'number' && Number.isSafeInteger(paise) && paise >= 0 && paise <= MAX_PRICE_PAISE;
const hasTwoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-9;
export const isCodPercent = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_COD_PERCENT && hasTwoDecimals(value);
export const isDiscount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_DISCOUNT_PERCENT && hasTwoDecimals(value);

export interface RateChange {
  carrier: string;
  zone: Zone;
  basePaise: number;
  extraPer500gPaise: number;
  codPercent: number;
  codMinimumPaise: number;
}

export type RateField = 'base' | 'extra' | 'codPercent' | 'codMinimum';

/** Checks the rate edit form. Carrier and zone are checked against the rate card separately. */
export function validateRate(input: Record<RateField | 'carrier' | 'zone', string>):
  | { ok: true; value: RateChange }
  | { ok: false; errors: Partial<Record<RateField | 'row', string>> } {
  const errors: Partial<Record<RateField | 'row', string>> = {};
  const base = rupeesToPaise(input.base);
  const extra = rupeesToPaise(input.extra);
  const codPercent = parsePercent(input.codPercent);
  const codMinimum = rupeesToPaise(input.codMinimum);
  if (!isPrice(base)) errors.base = PRICE_MESSAGE;
  if (!isPrice(extra)) errors.extra = PRICE_MESSAGE;
  if (!isCodPercent(codPercent)) errors.codPercent = COD_PERCENT_MESSAGE;
  if (!isCodMinimum(codMinimum)) errors.codMinimum = COD_MINIMUM_MESSAGE;
  if (!(CARRIERS as readonly string[]).includes(input.carrier) || !(ZONES as readonly string[]).includes(input.zone)) {
    errors.row = 'That rate card row does not exist.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      carrier: input.carrier,
      zone: input.zone as Zone,
      basePaise: base!,
      extraPer500gPaise: extra!,
      codPercent: codPercent!,
      codMinimumPaise: codMinimum!,
    },
  };
}

export const cleanText = (text: string) => text.replace(/\s+/g, ' ').trim();

export interface OverrideInput {
  merchantId: string;
  /** A courier, or 'all' for every courier. */
  carrier: string;
  discountPercent: number;
  reason: string;
}

export function validateOverride(input: { merchantId: string; carrier: string; discount: string; reason: string }):
  | { ok: true; value: OverrideInput }
  | { ok: false; errors: Partial<Record<'merchant' | 'carrier' | 'discount' | 'reason', string>> } {
  const errors: Partial<Record<'merchant' | 'carrier' | 'discount' | 'reason', string>> = {};
  const discount = parsePercent(input.discount);
  const reason = cleanText(input.reason);
  if (!input.merchantId) errors.merchant = 'Choose a merchant.';
  if (input.carrier !== 'all' && !(CARRIERS as readonly string[]).includes(input.carrier)) errors.carrier = 'Choose a courier.';
  if (!isDiscount(discount)) errors.discount = DISCOUNT_MESSAGE;
  if (reason.length < 5 || reason.length > 300) errors.reason = REASON_MESSAGE;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { merchantId: input.merchantId, carrier: input.carrier, discountPercent: discount!, reason } };
}

export interface RateFilters {
  carrier: string;
  zone: string;
}

/** ?carrier=&zone= from the URL; anything unknown is ignored. */
export function parseRateFilters(params: Record<string, string | string[] | undefined>): RateFilters {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';
  const carrier = one(params.carrier).toLowerCase();
  const zone = one(params.zone).toUpperCase();
  return {
    carrier: (CARRIERS as readonly string[]).includes(carrier) ? carrier : '',
    zone: (ZONES as readonly string[]).includes(zone) ? zone : '',
  };
}

export function rateFiltersHref({ carrier, zone }: RateFilters): string {
  const query = new URLSearchParams();
  if (carrier) query.set('carrier', carrier);
  if (zone) query.set('zone', zone);
  const text = query.toString();
  return text ? `/admin/pricing?${text}` : '/admin/pricing';
}
