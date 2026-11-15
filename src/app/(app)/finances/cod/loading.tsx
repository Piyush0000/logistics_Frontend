import { Skeleton } from '@/components/ui/skeleton';

export default function CodLoading() {
  return (
    <div role="status" aria-label="Loading COD remittance" className="grid gap-4 lg:gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <Skeleton className="h-9 w-56 max-w-full lg:h-[42px]" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full sm:w-36 lg:h-control" />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-card xl:h-28" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
