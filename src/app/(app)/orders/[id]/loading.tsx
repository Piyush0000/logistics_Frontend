import { Skeleton } from '@/components/ui/skeleton';

/** Shipment detail placeholder: header card, timeline beside the address cards. */
export default function OrderDetailLoading() {
  return (
    <div role="status" aria-label="Loading shipment" className="grid gap-4 lg:gap-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-24 rounded-card" />
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-4 lg:gap-5">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
        <div className="grid content-start gap-4 lg:gap-5">
          <Skeleton className="h-44 rounded-card" />
          <Skeleton className="h-44 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
        </div>
      </div>
    </div>
  );
}
