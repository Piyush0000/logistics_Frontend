import {
  CircleCheck,
  ClipboardList,
  Handshake,
  Navigation,
  Package,
  PackageCheck,
  PackageMinus,
  PackageX,
  RotateCw,
  TrendingUp,
  Truck,
  Undo2,
} from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SampleBadge } from '@/components/sample-badge';
import { getDemoSession } from '@/lib/auth/session';
import { overviewService } from '@/lib/data/overview';
import { shipmentService } from '@/lib/data/shipments';
import { walletService } from '@/lib/data/wallet';
import { formatDateRange } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { AlertTicker, DetailCard, KpiCard, OverviewTabs, PageHeading, Tile } from './sections';

export const metadata: Metadata = { title: 'Dashboard | Evoc Logistics' };

const vsYesterday = (percent: number) => `${percent}% vs past day`;

export default async function DashboardPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [wallet, overview, shipments] = await Promise.all([
    walletService().getBalance(),
    overviewService().getOverview(),
    shipmentService().getSummary(),
  ]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <AlertTicker />
      <PageHeading dateRange={formatDateRange(new Date())} />
      <OverviewTabs />

      {overview.ok ? (
        <section data-testid="kpi-section" aria-label="Today" className="grid gap-2">
          {overview.source === 'mock' ? (
            <div className="flex justify-end">
              <SampleBadge />
            </div>
          ) : null}
          <div
            data-testid="kpi-cards"
            className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4"
          >
            <KpiCard
              title="Today's Order"
              value={`${overview.data.ordersToday} Orders`}
              note={vsYesterday(overview.data.ordersChangePercent)}
              icon={Package}
              tone="primary"
            />
            <KpiCard
              title="Today's Revenue"
              value={formatPaise(overview.data.revenueTodayPaise, { decimals: 0 })}
              note={vsYesterday(overview.data.revenueChangePercent)}
              icon={TrendingUp}
              tone="success"
            />
            <KpiCard
              title="Average Shipping"
              value={formatPaise(overview.data.averageShippingPaise, { decimals: 0 })}
              note={`Min: ${formatPaise(overview.data.minimumShippingPaise, { decimals: 0 })}`}
              icon={Truck}
              tone="warning"
            />
            <KpiCard
              title="Today's Delivery"
              value={String(overview.data.deliveriesToday)}
              note={vsYesterday(overview.data.deliveriesChangePercent)}
              icon={Handshake}
              tone="accent"
            />
          </div>
        </section>
      ) : null}

      <DetailCard testId="shipments-card" title="Shipments Details" result={shipments}>
        {(summary) => (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <Tile label="To Be Processed" value={summary.toBeProcessed} icon={ClipboardList} />
            <Tile label="Ready to Ship" value={summary.readyToShip} icon={PackageCheck} />
            <Tile label="In Transit" value={summary.inTransit} icon={Truck} />
            <Tile label="Out for Delivery" value={summary.outForDelivery} icon={Navigation} />
            <Tile label="Delivered" value={summary.delivered} icon={CircleCheck} />
            <Tile label="RTO" value={summary.rto} icon={Undo2} />
          </div>
        )}
      </DetailCard>

      <DetailCard testId="ndr-card" title="NDR Details" result={overview}>
        {({ ndr }) => (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="NDR Order" value={ndr.open} icon={PackageX} />
            <Tile label="Re-attempted" value={ndr.reattempted} icon={RotateCw} />
            <Tile label="NDR Delivered" value={ndr.delivered} icon={PackageCheck} />
            <Tile label="NDR Returned" value={ndr.returned} icon={PackageMinus} />
          </div>
        )}
      </DetailCard>
    </AppShell>
  );
}
