import { isValidIsoDay } from './format/calendar';
import { indianDay } from './format/date';

export const REPORT_TYPES = ['shipments', 'ndr', 'rto', 'cod', 'wallet'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** `from` and `to` are YYYY-MM-DD in Indian time, at most 92 days apart, both days included. */
export interface ReportRequest {
  type: ReportType;
  from: string;
  to: string;
}

export const MAX_REPORT_DAYS = 92;
export const DEFAULT_REPORT_DAYS = 30;
export const REPORTS_PATH = '/reports';
export const REPORTS_EXPORT_PATH = `${REPORTS_PATH}/export`;

export const REPORT_CARDS: { type: ReportType; title: string; description: string }[] = [
  { type: 'shipments', title: 'Shipments', description: 'Every shipment booked in the range, with its courier and current status.' },
  { type: 'ndr', title: 'NDR', description: 'Failed delivery attempts and what happened next.' },
  { type: 'rto', title: 'RTO', description: 'Shipments returning to you or already back, started in the range.' },
  { type: 'cod', title: 'COD remittance', description: 'Cash on Delivery collected, deductions and what is due to you.' },
  { type: 'wallet', title: 'Wallet transactions', description: 'Every credit and debit on your wallet.' },
];

const COLUMNS: Record<ReportType, string[]> = {
  shipments: ['Reference', 'AWB', 'Courier', 'Status', 'Created', 'Last Update'],
  rto: ['Reference', 'AWB', 'Courier', 'Status', 'Created', 'Last Update'],
  ndr: ['AWB', 'Reference', 'Courier', 'Recipient', 'City', 'Attempts', 'Last Attempt', 'Reason', 'Status'],
  cod: ['Order Number', 'AWB', 'Courier', 'COD Amount', 'Deductions', 'Remittable', 'Status', 'Collected', 'Settled At'],
  wallet: ['Date', 'Type', 'Description', 'Order', 'Amount'],
};

export function reportColumns(type: ReportType): string[] {
  return COLUMNS[type];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days from `from` to `to`, counting both ends. */
function inclusiveDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** The last 30 days in Indian time, ending today. */
export function defaultReportRange(now: Date = new Date()): { from: string; to: string } {
  const to = indianDay(now);
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - (DEFAULT_REPORT_DAYS - 1) * DAY_MS)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

export function validateReport(
  input: unknown,
): { ok: true; value: ReportRequest } | { ok: false; message: string } {
  const data = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const { type, from, to } = data;

  if (typeof type !== 'string' || !(REPORT_TYPES as readonly string[]).includes(type)) {
    return { ok: false, message: 'Choose a report type from the list.' };
  }
  if (typeof from !== 'string' || !isValidIsoDay(from)) {
    return { ok: false, message: 'Choose a valid From date.' };
  }
  if (typeof to !== 'string' || !isValidIsoDay(to)) {
    return { ok: false, message: 'Choose a valid To date.' };
  }
  if (to < from) return { ok: false, message: 'To date must be on or after From date.' };
  if (inclusiveDays(from, to) > MAX_REPORT_DAYS) {
    return { ok: false, message: `Choose a range of ${MAX_REPORT_DAYS} days or fewer.` };
  }
  return { ok: true, value: { type: type as ReportType, from, to } };
}

export function reportFileName({ type, from, to }: ReportRequest): string {
  return `${type}-${from}-to-${to}.csv`;
}

export function reportHref(request: ReportRequest): string {
  return `${REPORTS_EXPORT_PATH}?${new URLSearchParams({ type: request.type, from: request.from, to: request.to }).toString()}`;
}
