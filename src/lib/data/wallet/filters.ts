import { isValidIsoDay } from '../../format/calendar';

export const TRANSACTION_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
] as const;

export const DEBIT_TYPES = [
  { value: 'b2c-prepaid', label: 'B2C Prepaid Charges' },
  { value: 'b2c-cod', label: 'B2C COD Charges' },
  { value: 'rto-freight', label: 'RTO Freight' },
  { value: 'reverse-shipment', label: 'Reverse Shipment' },
  { value: 'invoice-payment', label: 'Invoice Payment' },
  { value: 'invoice-credits', label: 'Invoice Credits/Waivers' },
  { value: 'weight-discrepancy', label: 'Weight Discrepancy' },
  { value: 'dispute-rejected', label: 'Dispute Rejected' },
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number]['value'];
export type DebitType = (typeof DEBIT_TYPES)[number]['value'];

export interface WalletFilters {
  type: TransactionType;
  debitType: DebitType | 'all';
  /** YYYY-MM-DD in Indian time, or empty for no limit. */
  from: string;
  to: string;
  page: number;
}

export const DEFAULT_FILTERS: WalletFilters = {
  type: 'all',
  debitType: 'all',
  from: '',
  to: '',
  page: 1,
};

export const WALLET_PATH = '/finances/wallet';

export const DATE_ORDER_ERROR = 'From Date must be on or before To Date.';

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

const validDay = (value: string) => (isValidIsoDay(value) ? value : '');

function validPage(value: string): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/** Reads filters from the URL. Anyone can edit a URL, so unknown values fall back to defaults. */
export function parseWalletFilters(params: SearchParams): {
  filters: WalletFilters;
  error: string | null;
} {
  const type =
    TRANSACTION_TYPES.find(({ value }) => value === first(params.type))?.value ??
    DEFAULT_FILTERS.type;
  const debitType =
    DEBIT_TYPES.find(({ value }) => value === first(params.debitType))?.value ??
    DEFAULT_FILTERS.debitType;
  const from = validDay(first(params.from));
  const to = validDay(first(params.to));

  return {
    filters: {
      type,
      debitType: type === 'credit' ? 'all' : debitType,
      from,
      to,
      page: validPage(first(params.page)),
    },
    error: from && to && from > to ? DATE_ORDER_ERROR : null,
  };
}

export function hasActiveFilters(filters: WalletFilters): boolean {
  return (
    filters.type !== DEFAULT_FILTERS.type ||
    filters.debitType !== DEFAULT_FILTERS.debitType ||
    filters.from !== DEFAULT_FILTERS.from ||
    filters.to !== DEFAULT_FILTERS.to
  );
}

export function walletHref(filters: WalletFilters, page = 1): string {
  const query = new URLSearchParams();
  if (filters.type !== DEFAULT_FILTERS.type) query.set('type', filters.type);
  if (filters.debitType !== DEFAULT_FILTERS.debitType) query.set('debitType', filters.debitType);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (page > 1) query.set('page', String(page));
  const search = query.toString();
  return search ? `${WALLET_PATH}?${search}` : WALLET_PATH;
}
