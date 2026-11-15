import Link from 'next/link';
import type { Range } from '@/lib/data/analytics';

const OPTIONS: Range[] = [7, 30];

/** Last 7 days or last 30 days, kept in the URL as `range=` so a reload or a shared link keeps it. */
export function RangeToggle({ tab, range }: { tab: string; range: Range }) {
  return (
    <nav aria-label="Date range" className="flex rounded-full bg-muted">
      {OPTIONS.map((days) => {
        const selected = days === range;
        return (
          <Link
            key={days}
            href={days === 7 ? `/dashboard?tab=${tab}` : `/dashboard?tab=${tab}&range=${days}`}
            aria-current={selected ? 'true' : undefined}
            className={`flex h-11 items-center rounded-full px-4 text-sm whitespace-nowrap ${
              selected ? 'bg-primary font-medium text-on-primary' : 'text-on-surface hover:bg-primary/10'
            }`}
          >
            Last {days} days
          </Link>
        );
      })}
    </nav>
  );
}
