import { Skeleton } from '@/components/ui/skeleton';

export default function InvoicesLoading() {
  return (
    <div role="status" aria-label="Loading invoices" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-40 lg:h-[42px]" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
      <Skeleton className="h-36 rounded-card sm:h-28" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
