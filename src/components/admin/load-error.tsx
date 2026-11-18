import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import type { DataResult } from '@/lib/data/source';

/**
 * A detail page whose data did not load for a reason other than "not found" (for example the
 * backend route is not available yet in gateway mode). Shows the page title and the error with
 * Try again, instead of throwing to the global error page or answering a false 404.
 * Call notFound() yourself first when `result.error.kind === 'not_found'`.
 */
export function AdminLoadError<T>({ title, testId, result }: { title: string; testId: string; result: DataResult<T> }) {
  return (
    <>
      <PageHeader title={title} />
      <DataCard testId={testId} title={title} result={result}>
        {() => null}
      </DataCard>
    </>
  );
}
