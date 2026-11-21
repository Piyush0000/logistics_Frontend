import type { LucideIcon } from 'lucide-react';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { SampleBadge } from '@/components/sample-badge';
import { StatTile, type StatTone } from '@/components/ui/stat-tile';
import type { DataResult } from '@/lib/data/source';

/** One tile with its own data source, so a failed source shows its error here and nowhere else. */
export function StatCard<T>({
  testId,
  label,
  icon,
  result,
  value,
  tone = 'primary',
}: {
  testId: string;
  label: string;
  icon: LucideIcon;
  tone?: StatTone;
  result: DataResult<T>;
  value: (data: T) => string | number;
}) {
  // No backend for this figure yet: leave the tile out.
  if (!result.ok && result.error.kind === 'unavailable') return null;
  return (
    <div
      data-testid={testId}
      className="lift min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card"
    >
      {result.ok ? (
        <>
          {/* Icon above the text on narrow phones, so long amounts stay on one line. */}
          <div className="[&>div]:flex-col [&>div]:items-start min-[420px]:[&>div]:flex-row min-[420px]:[&>div]:items-center">
            <StatTile label={label} value={value(result.data)} icon={icon} tone={tone} animate />
          </div>
          {result.source === 'mock' ? (
            <div className="mt-2">
              <SampleBadge />
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid gap-2">
          <p className="text-sm text-on-surface/70">{label}</p>
          <p className="text-sm">
            {result.error.kind === 'unauthorized'
              ? 'Sign in again to see this data.'
              : result.error.message}
          </p>
          <div>
            <RetryButton />
          </div>
        </div>
      )}
    </div>
  );
}
