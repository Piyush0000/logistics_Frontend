import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the printable invoice: the controls row, then the invoice sheet. */
export default function InvoiceLoading() {
  return (
    <div role="status" aria-label="Loading invoice" className="mx-auto grid w-full max-w-[210mm] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-44 lg:h-control" />
        <Skeleton className="h-11 w-36 lg:h-control" />
      </div>
      <div className="grid gap-6 rounded-card border border-secondary bg-surface p-card">
        <div className="grid gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-56 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-card" />
      </div>
    </div>
  );
}
