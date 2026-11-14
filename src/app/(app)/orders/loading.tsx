import { Skeleton } from '@/components/ui/skeleton';

/** Shipments list placeholder: header, filter bar, status tabs, then rows. */
export default function OrdersLoading() {
  return (
    <div role="status" aria-label="Loading shipments" className="grid gap-4 lg:gap-5">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-16 rounded-card" />
      <Skeleton className="h-14 rounded-card" />
      <div className="grid gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
    </div>
  );
}
