import { Skeleton } from '@/components/ui/skeleton';

export default function SupportTicketLoading() {
  return (
    <div role="status" aria-label="Loading support ticket" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:gap-5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-80 max-w-full lg:h-10" />
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <Skeleton className="h-40 rounded-card xl:col-start-2 xl:row-start-1 xl:h-72" />
        <div className="grid gap-3 rounded-card border border-secondary bg-surface p-card xl:col-start-1 xl:row-start-1">
          <Skeleton className="h-7 w-36" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
          <Skeleton className="h-32 rounded-control" />
        </div>
      </div>
    </div>
  );
}
