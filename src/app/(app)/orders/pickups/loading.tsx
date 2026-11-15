import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the pickups page: title, the ready-to-ship card and the scheduled pickups card. */
export default function PickupsLoading() {
  return (
    <div role="status" aria-label="Loading pickups" className="grid gap-4 lg:gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-80 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
