import { Skeleton } from '@/components/ui/skeleton';

/** Create-shipment placeholder: title, then the form's sections. */
export default function CreateShipmentLoading() {
  return (
    <div role="status" aria-label="Loading shipment form" className="grid gap-4 lg:gap-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-72" />
      {['h-64', 'h-64', 'h-48'].map((height, i) => (
        <Skeleton key={i} className={`${height} rounded-card`} />
      ))}
    </div>
  );
}
