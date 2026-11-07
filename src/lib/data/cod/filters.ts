import { isValidIsoDay } from '../../format/calendar';
import { DATE_ORDER_ERROR } from '../wallet/filters';

export const COD_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'settled', label: 'Settled' },
] as const;

export const PAGE_SIZES = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
] as const;

export type CodStatusFilter = (typeof COD_STATUSES)[number]['value'];
export type CodPageSize = 10 | 20 | 50;

export interface CodFilters {
  status: CodStatusFilter;
  /** YYYY-MM-DD in Indian time, or empty for no limit. */
  from: string;
  to: string;
  page: number;
  perPage: CodPageSize;
}

export const DEFAULT_COD_FILTERS: CodFilters = {
  status: 'all',
  from: '',
  to: '',
  page: 1,
  perPage: 20,
};

export const COD_PATH = '/finances/cod';
export const COD_EXPORT_PATH = `${COD_PATH}/export`;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

const validDay = (value: string) => (isValidIsoDay(value) ? value : '');

function validPage(value: string): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function validPageSize(value: string): CodPageSize {
  const size = Number(value);
  return size === 10 || size === 50 ? size : DEFAULT_COD_FILTERS.perPage;
}

/** Reads filters from the URL. Anyone can edit a URL, so unknown values fall back to defaults. */
export function parseCodFilters(params: SearchParams): {
  filters: CodFilters;
  error: string | null;
} {
  const from = validDay(first(params.from));
  const to = validDay(first(params.to));

  return {
    filters: {
      status:
        COD_STATUSES.find(({ value }) => value === first(params.status))?.value ??
        DEFAULT_COD_FILTERS.status,
      from,
      to,
      page: validPage(first(params.page)),
      perPage: validPageSize(first(params.perPage)),
    },
    error: from && to && from > to ? DATE_ORDER_ERROR : null,
  };
}

export function hasActiveCodFilters(filters: CodFilters): boolean {
  return filters.status !== DEFAULT_COD_FILTERS.status || Boolean(filters.from || filters.to);
}

export function codHref(
  filters: CodFilters,
  { page = 1, path = COD_PATH }: { page?: number; path?: string } = {},
): string {
  const query = new URLSearchParams();
  if (filters.status !== DEFAULT_COD_FILTERS.status) query.set('status', filters.status);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.perPage !== DEFAULT_COD_FILTERS.perPage) query.set('perPage', String(filters.perPage));
  if (page > 1) query.set('page', String(page));
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
