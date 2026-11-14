import { Skeleton } from '@/components/ui/skeleton';

/** Public tracking placeholder: AWB header, stage bar and the timeline. */
export default function TrackLoading() {
  return (
    <div role="status" aria-label="Loading tracking" className="grid gap-4 rounded-card border border-secondary bg-surface p-card">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-12" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}
