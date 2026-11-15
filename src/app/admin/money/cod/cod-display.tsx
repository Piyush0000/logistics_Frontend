import type { ChipTone } from '@/components/admin/status-chip';
import type { CodExceptionStatus, CodExceptionType, LineMatch, RemittanceStatus } from '@/lib/admin/data/money';
import { formatPaise } from '@/lib/format/money';

/** Labels and colours shared by the Money page and the batch page. No client code, safe for both. */

export const REMITTANCE_STATUS: Record<RemittanceStatus, [string, ChipTone]> = {
  expected: ['Not paid', 'neutral'],
  received: ['To reconcile', 'info'],
  reconciled: ['Reconciled', 'success'],
  short: ['Short', 'error'],
};

export const LINE_MATCH: Record<LineMatch, [string, ChipTone]> = {
  pending: ['Not paid', 'neutral'],
  unchecked: ['Not checked', 'info'],
  matched: ['Matched', 'success'],
  mismatch: ['Mismatch', 'error'],
};

export const EXCEPTION_TYPE: Record<CodExceptionType, string> = {
  amount_mismatch: 'Amount mismatch',
  unknown_awb: 'Unknown AWB',
  duplicate_payment: 'Duplicate payment',
  overdue_remittance: 'Overdue remittance',
};

export const EXCEPTION_STATUS: Record<CodExceptionStatus, [string, ChipTone]> = {
  open: ['Open', 'warning'],
  resolved: ['Resolved', 'success'],
  written_off: ['Written off', 'neutral'],
};

export const codBatchHref = (id: string) => `/admin/money/cod/${id}`;

/** Received minus expected: red with a minus when short, a plus when over, plain at zero. */
export function Difference({ paise, testId }: { paise: number; testId?: string }) {
  if (paise === 0) return <span data-testid={testId}>{formatPaise(0)}</span>;
  return (
    <span data-testid={testId} className={paise < 0 ? 'font-semibold text-error' : 'text-success'}>
      {paise < 0 ? '−' : '+'}
      {formatPaise(Math.abs(paise))}
    </span>
  );
}

// Not SECONDARY_BUTTON: dialog.tsx is a client file, so a server page importing it gets a placeholder, not the classes.
export const LINK_BUTTON =
  'inline-flex h-11 items-center justify-center gap-2 rounded-control border border-secondary bg-surface px-4 text-sm font-medium transition-colors duration-150 hover:border-primary/40 hover:bg-muted lg:h-control';
