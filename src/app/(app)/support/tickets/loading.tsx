import { Skeleton } from '@/components/ui/skeleton';

export default function SupportTicketsLoading() {
  return (
    <div role="status" aria-label="Loading support tickets" className="grid gap-4 lg:gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <Skeleton className="h-9 w-56 lg:h-10" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-control w-32" />
      </div>
      <Skeleton className="h-28 rounded-card sm:h-24" />
      <div className="grid gap-4 rounded-card border border-secondary bg-surface p-card">
        <Skeleton className="h-7 w-28" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card lg:h-12 lg:rounded-control" />
        ))}
      </div>
    </div>
  );
}
