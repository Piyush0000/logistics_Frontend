import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the RTO page: title, summary card, stage tabs and the shipments card. */
export default function RtoLoading() {
  return (
    <div role="status" aria-label="Loading RTO shipments" className="grid gap-4 lg:gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-12 w-full rounded-card sm:w-72" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
