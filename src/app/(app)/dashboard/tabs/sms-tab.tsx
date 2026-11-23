import Link from 'next/link';
import { IndianRupee, MessageCircle, MinusCircle, XCircle } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import type { Range } from '@/lib/data/analytics';
import { messagesService } from '@/lib/data/messages';
import { formatPaise } from '@/lib/format/money';
import { statusLabel } from '@/lib/format/status';
import { RangeToggle } from './range-toggle';

const count = (n: number) => n.toLocaleString('en-IN');
const eventLabel = (status: string) => (status === 'NDR' ? 'Failed delivery attempt' : statusLabel(status));

/** WhatsApp updates to buyers: sent, skipped (and why), failed, and what they cost. One source, one card. */
export async function SmsTab({ range }: { range: Range }) {
  const result = await messagesService().getStats(range);

  return (
    <DataCard
      testId="sms-tab-card"
      title="WhatsApp updates"
      result={result}
      actions={<RangeToggle tab="sms" range={range} />}
    >
      {({ sent, skipped, failed, chargedPaise, byStatus, reasons }) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile testId="tile-Sent" label="Sent" value={count(sent)} icon={MessageCircle} />
            <StatTile testId="tile-Skipped" label="Skipped" value={count(skipped)} icon={MinusCircle} />
            <StatTile testId="tile-Failed" label="Failed" value={count(failed)} icon={XCircle} />
            <StatTile testId="tile-Charged" label="Charged" value={formatPaise(chargedPaise)} icon={IndianRupee} />
          </div>
          <BarChart
            label="Messages sent by shipment event"
            categoryLabel="Shipment event"
            data={byStatus.map((row) => ({ label: eventLabel(row.status), value: row.count }))}
            format={count}
          />
          {reasons.length ? (
            <div>
              <h3 className="text-sm font-semibold">Why some were not sent</h3>
              <ul className="mt-2 grid gap-1 text-sm text-on-surface/80">
                {reasons.map((r) => (
                  <li key={r.reason} className="flex justify-between gap-3">
                    <span className="first-letter:uppercase">{r.reason}</span>
                    <span className="font-mono">{count(r.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link
            href="/settings/notifications"
            className="flex h-11 w-fit items-center rounded-full border border-secondary px-4 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Manage buyer notifications
          </Link>
        </div>
      )}
    </DataCard>
  );
}
