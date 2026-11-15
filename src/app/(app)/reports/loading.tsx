import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsLoading() {
  return (
    <div role="status" aria-label="Loading reports" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-48 lg:h-10" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
      <Skeleton className="h-36 rounded-card" />
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-card" />
        ))}
      </div>
    </div>
  );
}
