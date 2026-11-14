import { Skeleton } from '@/components/ui/skeleton';

export default function SubMerchantsLoading() {
  return (
    <div role="status" aria-label="Loading sub-merchants" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-48 lg:h-10" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="h-11 w-40 lg:hidden" />
        <Skeleton className="hidden h-96 rounded-card lg:block" />
        <div className="grid min-w-0 gap-6">
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    </div>
  );
}
