import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the NDR page: back link, title, four figures, the outcomes card and the list. */
export default function NdrLoading() {
  return (
    <div role="status" aria-label="Loading NDR" className="grid gap-4 lg:gap-5">
      <Skeleton className="h-5 w-32" />
      <div className="grid gap-2">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
