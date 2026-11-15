import { Skeleton } from '@/components/ui/skeleton';

export default function WeightSettingsLoading() {
  return (
    <div role="status" aria-label="Loading weight settings" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-56 max-w-full lg:h-[42px]" />
        <Skeleton className="h-5 w-full max-w-3xl" />
      </div>
      <div className="grid gap-4 rounded-card border border-secondary bg-surface p-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-11 w-32 lg:h-control" />
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
