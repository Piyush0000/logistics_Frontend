import { Skeleton } from '@/components/ui/skeleton';

export default function WalletLoading() {
  return (
    <div role="status" aria-label="Loading wallet transactions" className="grid gap-4 lg:gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Skeleton className="h-9 w-64 max-w-full lg:h-[42px]" />
        <Skeleton className="h-11 w-28 lg:h-control" />
      </div>
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
      <Skeleton className="h-40 rounded-card xl:h-28" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
