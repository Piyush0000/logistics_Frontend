import { Skeleton } from '@/components/ui/skeleton';

export default function WeightLoading() {
  return (
    <div role="status" aria-label="Loading weight discrepancies" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-72 max-w-full lg:h-[42px]" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 rounded-card border border-secondary bg-surface p-card">
        <Skeleton className="h-7 w-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
      <Skeleton className="h-40 rounded-card sm:h-28" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
