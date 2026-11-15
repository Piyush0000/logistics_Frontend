import Link from 'next/link';
import { CheckCircle2, MessageSquare, Percent, XCircle } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DataCard } from '@/components/ui/data-card';
import { StatTile } from '@/components/ui/stat-tile';
import type { Range } from '@/lib/data/analytics';
import { messagesService } from '@/lib/data/messages';
import { deliveryRate } from '@/lib/data/messages/rate';
import { statusLabel } from '@/lib/format/status';
import { RangeToggle } from './range-toggle';

const count = (n: number) => n.toLocaleString('en-IN');

/** Buyer text messages: sent, delivered, failed, and how many each shipment status sent. One source, so one card. */
export async function SmsTab({ range }: { range: Range }) {
  const result = await messagesService().getStats(range);

  return (
    <DataCard
      testId="sms-tab-card"
      title="SMS"
      result={result}
      actions={<RangeToggle tab="sms" range={range} />}
    >
      {({ sent, delivered, failed, byStatus }) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile testId="tile-Sent" label="Sent" value={count(sent)} icon={MessageSquare} />
            <StatTile testId="tile-Delivered" label="Delivered" value={count(delivered)} icon={CheckCircle2} />
            <StatTile testId="tile-Failed" label="Failed" value={count(failed)} icon={XCircle} />
            <StatTile
              testId="tile-Delivery rate"
              label="Delivery rate"
              value={deliveryRate(sent, delivered)}
              icon={Percent}
            />
          </div>
          <BarChart
            label="Messages by shipment status"
            categoryLabel="Shipment status"
            data={byStatus.map((row) => ({ label: statusLabel(row.status), value: row.count }))}
            format={count}
          />
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
