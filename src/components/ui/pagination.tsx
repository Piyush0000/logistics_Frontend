import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const STEP =
  'inline-flex size-11 items-center justify-center rounded-control border border-secondary bg-surface transition-colors duration-150 lg:size-9';

function Step({
  enabled,
  label,
  href,
  children,
}: {
  enabled: boolean;
  label: string;
  href: string;
  children: ReactNode;
}) {
  if (!enabled) {
    return (
      <span role="link" aria-disabled="true" aria-label={label} className={`${STEP} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={`${STEP} hover:border-primary`}>
      {children}
    </Link>
  );
}

/**
 * Previous and next page links. `buildHref` makes each link, so the caller keeps its other
 * URL parameters.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const current = Math.min(Math.max(page, 1), pageCount);

  return (
    <nav
      aria-label="Pagination"
      data-testid="pagination"
      className="flex items-center justify-end gap-2 text-sm"
    >
      <Step
        enabled={current > 1}
        label="Previous page"
        href={buildHref(current - 1)}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Step>
      <span className="font-medium text-on-surface/70">
        Page {current} of {pageCount}
      </span>
      <Step
        enabled={current < pageCount}
        label="Next page"
        href={buildHref(current + 1)}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Step>
    </nav>
  );
}
