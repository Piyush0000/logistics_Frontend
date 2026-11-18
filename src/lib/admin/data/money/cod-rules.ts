/**
 * The rules for COD remittance actions, mirroring the reconciliation service (Evoc_ships/services/
 * reconciliation). No server code, so popups can show the same limits; the server checks again.
 */
import { cleanReason, parseRupees, REASON_MAX, REASON_MIN } from './wallet-adjustment';

/** Days a courier has to pay out COD after the batch's last delivery day. Same as CARRIER_COD_SLA_DAYS. */
export const COD_PAYOUT_DAYS: Record<string, number> = { delhivery: 7, shadowfax: 5, ekart: 7 };
export const DEFAULT_COD_PAYOUT_DAYS = 7;

export function payoutDays(carrier: string): number {
  return COD_PAYOUT_DAYS[carrier.toLowerCase()] ?? DEFAULT_COD_PAYOUT_DAYS;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (yyyyMmDd: string) => Date.parse(`${yyyyMmDd}T00:00:00Z`);

/** The date a batch's payout is due: its last delivery day plus the courier's payout days. */
export function payoutDueDate(carrier: string, periodEnd: string): string {
  return new Date(utcDay(periodEnd) + payoutDays(carrier) * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days past the due date on `today` (YYYY-MM-DD); 0 or less means not overdue. */
export function daysPastDue(dueDate: string, today: string): number {
  return Math.round((utcDay(today) - utcDay(dueDate)) / DAY_MS);
}

/** The most a single bank credit can be: ₹1 crore. */
export const MAX_BANK_CREDIT_PAISE = 10_000_000 * 100;
export const BANK_CREDIT_RANGE_MESSAGE = 'Enter the bank credit, from ₹0.01 to ₹1,00,00,000.';
export const UTR_MESSAGE = 'A UTR is 6 to 30 letters and digits, or leave it empty.';

export function parseBankCredit(text: string) {
  return parseRupees(text, { maxPaise: MAX_BANK_CREDIT_PAISE, rangeMessage: BANK_CREDIT_RANGE_MESSAGE });
}

/** An optional bank UTR, upper-cased; '' means none. */
export function parseUtr(text: string): { ok: true; utr: string | null } | { ok: false; message: string } {
  const cleaned = text.trim().toUpperCase();
  if (!cleaned) return { ok: true, utr: null };
  return /^[A-Z0-9]{6,30}$/.test(cleaned) ? { ok: true, utr: cleaned } : { ok: false, message: UTR_MESSAGE };
}

export type ResolutionType = 'resolved' | 'written_off';
export const RESOLUTION_MESSAGE = 'Choose Resolved or Written off.';
export const NOTE_MESSAGE = `Give a reason of ${REASON_MIN} to ${REASON_MAX} characters.`;

export function validateResolution(input: { resolution: string; note: string }):
  | { ok: true; value: { resolution: ResolutionType; note: string } }
  | { ok: false; errors: { resolution?: string; note?: string } } {
  const errors: { resolution?: string; note?: string } = {};
  if (input.resolution !== 'resolved' && input.resolution !== 'written_off') errors.resolution = RESOLUTION_MESSAGE;
  const note = cleanReason(input.note);
  if (note.length < REASON_MIN || note.length > REASON_MAX) errors.note = NOTE_MESSAGE;
  if (errors.resolution || errors.note) return { ok: false, errors };
  return { ok: true, value: { resolution: input.resolution as ResolutionType, note } };
}
