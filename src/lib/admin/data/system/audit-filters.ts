/** Audit log filters read from the URL. Safe to import from client components (no server code). */

import { isValidIsoDay } from '../../../format/calendar';

export interface AuditFilters {
  /** An exact action name, or empty for every action. */
  action: string;
  /** YYYY-MM-DD in Indian time, or empty for no limit. */
  from: string;
  to: string;
  page: number;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = { action: '', from: '', to: '', page: 1 };

export const AUDIT_PATH = '/admin/system';

export const BACKWARDS_RANGE_NOTICE = 'The dates were ignored, because To Date was before From Date.';

const MAX_ACTION_LENGTH = 80;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

function validPage(value: string): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/**
 * Anyone can edit a URL, so anything unusable falls back to the default instead of failing.
 * An action that is not in the log is dropped later, by the service, which knows the actions.
 */
export function parseAuditFilters(params: SearchParams): {
  filters: AuditFilters;
  notice: string | null;
} {
  const action = first(params.action).trim();
  const from = isValidIsoDay(first(params.from)) ? first(params.from) : '';
  const to = isValidIsoDay(first(params.to)) ? first(params.to) : '';
  const backwards = Boolean(from && to && from > to);

  return {
    filters: {
      action: action.length <= MAX_ACTION_LENGTH ? action : '',
      from: backwards ? '' : from,
      to: backwards ? '' : to,
      page: validPage(first(params.page)),
    },
    notice: backwards ? BACKWARDS_RANGE_NOTICE : null,
  };
}

export function auditHref(filters: AuditFilters, page = 1): string {
  const query = new URLSearchParams();
  if (filters.action) query.set('action', filters.action);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (page > 1) query.set('page', String(page));
  const search = query.toString();
  return search ? `${AUDIT_PATH}?${search}` : AUDIT_PATH;
}
