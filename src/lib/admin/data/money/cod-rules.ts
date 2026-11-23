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

/** Couriers whose COD payments can be recorded. */
export const COD_CARRIERS = [
  { value: 'delhivery', label: 'Delhivery' },
  { value: 'shadowfax', label: 'Shadowfax' },
  { value: 'ekart', label: 'Ekart' },
] as const;
export const MAX_PAYMENT_LINES = 5000;

export interface PaymentLine {
  awb: string;
  amountPaise: number;
}

/** One CSV row into cells. Handles quoted cells ("1,249.00") and doubled quotes inside them. */
export function csvCells(row: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i]!;
    if (quoted) {
      if (char === '"' && row[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * A courier's COD remittance file (CSV): one row per AWB with the amount paid in rupees. The
 * header names the columns; any column whose name has "awb" or "waybill" is the AWB, and one
 * with "amount", "cod" or "collected" is the amount, so each courier's own export works as is.
 */
export function parseRemittanceCsv(text: string): { ok: true; lines: PaymentLine[] } | { ok: false; message: string } {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((row) => row.trim() !== '');
  if (rows.length < 2) return { ok: false, message: 'The file needs a header row and at least one AWB row.' };
  const header = csvCells(rows[0]!).map((name) => name.toLowerCase());
  const awbColumn = header.findIndex((name) => /awb|waybill/.test(name));
  const amountColumn = header.findIndex((name, index) => index !== awbColumn && /amount|cod|collected/.test(name));
  if (awbColumn < 0 || amountColumn < 0) {
    return { ok: false, message: 'The header must have an AWB column and an amount column.' };
  }
  if (rows.length - 1 > MAX_PAYMENT_LINES) {
    return { ok: false, message: `A file can have at most ${MAX_PAYMENT_LINES} rows.` };
  }
  const lines: PaymentLine[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const cells = csvCells(rows[index]!);
    const awb = (cells[awbColumn] ?? '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9-]{4,40}$/.test(awb)) return { ok: false, message: `Row ${index + 1}: the AWB is missing or invalid.` };
    const amount = parseRupees((cells[amountColumn] ?? '').replace(/^₹|^Rs\.?\s*/i, ''), {
      maxPaise: MAX_BANK_CREDIT_PAISE,
      rangeMessage: 'out of range',
    });
    if (!amount.ok) return { ok: false, message: `Row ${index + 1}: the amount is not a rupee amount.` };
    lines.push({ awb, amountPaise: amount.paise });
  }
  return { ok: true, lines };
}
