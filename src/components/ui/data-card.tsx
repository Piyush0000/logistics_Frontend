import type { ReactNode } from 'react';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { SampleBadge } from '@/components/sample-badge';
import type { DataResult } from '@/lib/data/source';

/**
 * A card for one data source: a sample badge for mock data, the error with Try again when the
 * source failed, or the content. A failure stays inside this card, so the rest of the page works.
 * A feature whose backend is not built yet shows no card at all.
 */
export function DataCard<T>({
  testId,
  title,
  result,
  actions,
  children,
}: {
  testId: string;
  title: string;
  result: DataResult<T>;
  actions?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (!result.ok && result.error.kind === 'unavailable') return null;
  return (
    <section
      data-testid={testId}
      className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">{title}</h2>
          {result.source === 'mock' ? <SampleBadge /> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {result.ok ? (
        <div className="mt-4">{children(result.data)}</div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">
            {result.error.kind === 'unauthorized'
              ? 'Sign in again to see this data.'
              : result.error.message}
          </p>
          <RetryButton />
        </div>
      )}
    </section>
  );
}
