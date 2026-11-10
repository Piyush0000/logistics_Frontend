import { addDays, isValidIsoDay } from '../../format/calendar';
import { indianDay } from '../../format/date';
import {
  MAX_AWBS_PER_PICKUP,
  MAX_PICKUP_DAYS_AHEAD,
  type PickupInput,
  type PickupWindow,
} from './types';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Null when the date is today or up to 7 days ahead in Indian time, else what to tell the merchant. */
export function checkPickupDate(date: string, now: Date = new Date()): string | null {
  if (!isValidIsoDay(date)) return 'Choose a pickup date.';
  const today = indianDay(now);
  const last = addDays(today, MAX_PICKUP_DAYS_AHEAD);
  // YYYY-MM-DD strings sort in date order.
  if (date < today || date > last) {
    return `Pickup date must be from today to ${MAX_PICKUP_DAYS_AHEAD} days ahead.`;
  }
  return null;
}

/** Null when there is no window or it is two HH:mm times with the end after the start. */
export function checkWindow(window: PickupWindow | null): string | null {
  if (!window) return null;
  if (!TIME.test(window.start) || !TIME.test(window.end)) return 'Enter times like 10:00.';
  if (window.end <= window.start) return 'The window must end after it starts.';
  return null;
}

/** True when the carriers are not all the same, which one pickup cannot hold. */
export function hasMixedCarriers(carriers: readonly string[]): boolean {
  return new Set(carriers).size > 1;
}

export type ParsedPickup = { ok: true; data: PickupInput } | { ok: false; message: string };

/** Checks what a merchant sent. Whether the AWBs are ready to ship is checked against the shipments. */
export function parsePickupInput(input: unknown, now: Date = new Date()): ParsedPickup {
  const value = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;

  const pickupDate = typeof value.pickupDate === 'string' ? value.pickupDate : '';
  const dateProblem = checkPickupDate(pickupDate, now);
  if (dateProblem) return { ok: false, message: dateProblem };

  let window: PickupWindow | null = null;
  if (value.window !== null && value.window !== undefined) {
    const raw = value.window as Record<string, unknown>;
    if (typeof raw !== 'object' || typeof raw.start !== 'string' || typeof raw.end !== 'string') {
      return { ok: false, message: 'Enter times like 10:00.' };
    }
    window = { start: raw.start, end: raw.end };
  }
  const windowProblem = checkWindow(window);
  if (windowProblem) return { ok: false, message: windowProblem };

  const awbs = Array.isArray(value.awbs)
    ? [...new Set(value.awbs.filter((awb): awb is string => typeof awb === 'string' && awb !== ''))]
    : [];
  if (awbs.length === 0) return { ok: false, message: 'Select at least one shipment.' };
  if (awbs.length > MAX_AWBS_PER_PICKUP) {
    return { ok: false, message: `Select at most ${MAX_AWBS_PER_PICKUP} shipments per pickup.` };
  }

  const pickupAddressId = typeof value.pickupAddressId === 'string' ? value.pickupAddressId : '';
  if (!pickupAddressId) return { ok: false, message: 'Choose a pickup address.' };

  return { ok: true, data: { pickupDate, window, awbs, pickupAddressId } };
}
