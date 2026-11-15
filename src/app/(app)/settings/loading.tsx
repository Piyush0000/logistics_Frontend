import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div role="status" aria-label="Loading settings" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-48 lg:h-10" />
        <Skeleton className="h-5 w-full max-w-sm" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-card" />
        ))}
      </div>
    </div>
  );
}
