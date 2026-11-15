/** Shared shapes for admin lists. Safe to import from client components (no server code). */

export const ADMIN_PAGE_SIZE = 10;

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Slices one page out of a full list; a page past the end is clamped to the last page. */
export function paginate<T>(all: readonly T[], page = 1, pageSize = ADMIN_PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), page: current, pageSize, total: all.length };
}

/** Case-insensitive "contains" across the given fields; an empty query matches everything. */
export function matchesQuery(query: string | undefined, ...fields: (string | undefined)[]): boolean {
  const q = query?.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field?.toLowerCase().includes(q));
}
