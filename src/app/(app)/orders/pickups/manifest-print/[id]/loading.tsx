import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the manifest: buttons, then the sheet with its facts and AWB list. */
export default function ManifestLoading() {
  return (
    <div role="status" aria-label="Loading manifest" className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-40 lg:h-control" />
        <Skeleton className="h-11 w-36 lg:h-control" />
      </div>
      <div className="grid gap-6 rounded-(--radius-card) border border-secondary p-card">
        <div className="grid gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
        <div className="grid gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
