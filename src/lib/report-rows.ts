import { csvRupees } from './csv';
import { DEBIT_TYPES } from './data/wallet/filters';
import type { WalletTransaction } from './data/wallet/types';
import type { DataResult } from './data/source';
import { formatDateTime } from './format/date';

export const ORDER_PAGE_SIZE = 100;
export const MAX_ORDER_PAGES = 10;
export const MAX_REPORT_ROWS = ORDER_PAGE_SIZE * MAX_ORDER_PAGES;
export const TRUNCATED_NOTICE = `# Truncated: first ${MAX_REPORT_ROWS} rows. Narrow the date range to see the rest.`;

export type Capped<T> = { items: T[]; truncated: boolean };
type Page<T> = DataResult<{ items: T[]; total: number }>;

/** Up to 10 pages of 100, stopping early on a short page or the total. Truncated when more rows exist. */
export async function pageThrough<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
): Promise<DataResult<Capped<T>>> {
  const items: T[] = [];
  let total = 0;
  let source: 'gateway' | 'mock' = 'mock';

  for (let page = 1; page <= MAX_ORDER_PAGES; page += 1) {
    const result = await fetchPage(page);
    if (!result.ok) return result;
    source = result.source;
    total = result.data.total;
    items.push(...result.data.items);
    if (result.data.items.length < ORDER_PAGE_SIZE || items.length >= total) break;
  }

  return { ok: true, source, data: { items, truncated: items.length < total } };
}

/** Joins lists, sorts, and applies the row cap to the combined result. */
export function mergeCapped<T>(lists: Capped<T>[], compare: (a: T, b: T) => number): Capped<T> {
  const all = lists.flatMap((list) => list.items).sort(compare);
  return {
    items: all.slice(0, MAX_REPORT_ROWS),
    truncated: lists.some((list) => list.truncated) || all.length > MAX_REPORT_ROWS,
  };
}

export const walletRow = (entry: WalletTransaction): string[] => [
  formatDateTime(entry.occurredAt),
  entry.direction === 'credit' ? 'Credit' : 'Debit',
  entry.debitType
    ? `${entry.title} (${DEBIT_TYPES.find(({ value }) => value === entry.debitType)?.label ?? entry.debitType})`
    : entry.title,
  entry.orderRef ?? '',
  csvRupees(entry.direction === 'credit' ? entry.amountPaise : -entry.amountPaise),
];
