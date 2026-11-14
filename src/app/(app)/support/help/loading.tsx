import { Skeleton } from '@/components/ui/skeleton';

export default function HelpCentreLoading() {
  return (
    <div role="status" aria-label="Loading help centre" className="grid gap-4 lg:gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-48 lg:h-10" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-48 rounded-card sm:h-40" />
      <Skeleton className="h-5 w-24" />
      <div className="grid gap-3 lg:gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
    </div>
  );
}
