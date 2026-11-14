import { Skeleton } from '@/components/ui/skeleton';

export default function HelpArticleLoading() {
  return (
    <div role="status" aria-label="Loading help article" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:gap-5">
      <Skeleton className="h-5 w-40" />
      <div className="grid gap-2">
        <Skeleton className="h-9 w-80 max-w-full lg:h-10" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    </div>
  );
}
