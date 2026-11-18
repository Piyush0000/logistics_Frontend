import { indianDay } from '../../../format/date';
import { paginate } from '../common';
import type { AuditFilters } from './audit-filters';
import type { AuditEntry, AuditInput, AuditLog } from './types';

const LIMITS = { action: 80, target: 120, detail: 500 } as const;

function clean(value: unknown, limit: number): string {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** Tidies an entry before it is stored, so a caller's mistake never breaks the log. */
export function cleanAuditEntry(entry: AuditInput): AuditInput {
  return {
    action: clean(entry.action, LIMITS.action) || 'Unnamed action',
    target: clean(entry.target, LIMITS.target) || 'Not given',
    detail: clean(entry.detail, LIMITS.detail),
  };
}

/** Filters, then pages, a newest-first log. An action not in the log is ignored. */
export function filterAuditLog(entries: readonly AuditEntry[], filters: AuditFilters): AuditLog {
  const actions = [...new Set(entries.map(({ action }) => action))].sort();
  const applied = { ...filters, action: actions.includes(filters.action) ? filters.action : '' };

  const found = entries.filter((entry) => {
    const day = indianDay(entry.at);
    return (
      (!applied.action || entry.action === applied.action) &&
      (!applied.from || day >= applied.from) &&
      (!applied.to || day <= applied.to)
    );
  });

  return { page: paginate(found, applied.page), actions, applied };
}
