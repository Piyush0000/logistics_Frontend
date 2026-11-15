import { Skeleton } from '@/components/ui/skeleton';

export default function TrackingLoading() {
  return (
    <div role="status" aria-label="Loading order tracking" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-48 lg:h-10" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
      <Skeleton className="h-56 rounded-card" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
