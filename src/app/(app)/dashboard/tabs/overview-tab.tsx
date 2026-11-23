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
import { Gauge } from '@/components/charts/gauge';
import { SegmentBar } from '@/components/charts/segment-bar';
import { SampleBadge } from '@/components/sample-badge';
import { overviewService } from '@/lib/data/overview';
import { shipmentService } from '@/lib/data/shipments';
import { formatPaise } from '@/lib/format/money';
import { DetailCard, KpiCard, Tile } from '../sections';

const vsYesterday = (percent: number) => `${percent}% vs past day`;

export async function OverviewTab() {
  const [overview, shipments] = await Promise.all([
    overviewService().getOverview(),
    shipmentService().getSummary(),
  ]);

  return (
    <>
      {overview.ok ? (
        <section data-testid="kpi-section" aria-labelledby="kpi-title" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="kpi-title"
              className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl"
            >
              Today
            </h2>
            {overview.source === 'mock' ? <SampleBadge /> : null}
          </div>
          <div
            data-testid="kpi-cards"
            className="motion-stagger grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4"
          >
            <KpiCard
              title="Today's Orders"
              value={`${overview.data.ordersToday} Orders`}
              note={vsYesterday(overview.data.ordersChangePercent)}
              icon={Package}
              tone="primary"
            />
            <KpiCard
              title="Today's Order Value"
              value={formatPaise(overview.data.revenueTodayPaise, { decimals: 0 })}
              note={vsYesterday(overview.data.revenueChangePercent)}
              icon={TrendingUp}
              tone="success"
            />
            <KpiCard
              title="Average Shipping (30 days)"
              value={formatPaise(overview.data.averageShippingPaise, { decimals: 0 })}
              note={`Min: ${formatPaise(overview.data.minimumShippingPaise, { decimals: 0 })}`}
              icon={Truck}
              tone="warning"
            />
            <KpiCard
              title="Today's Deliveries"
              value={String(overview.data.deliveriesToday)}
              note={vsYesterday(overview.data.deliveriesChangePercent)}
              icon={Handshake}
              tone="accent"
            />
          </div>
        </section>
      ) : null}

      {/* Like Home's health row: the shipment pipeline beside the NDR outcome. */}
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DetailCard testId="shipments-card" title="Shipments Details" result={shipments}>
          {(summary) => (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Tile
                  label="To Be Processed"
                  value={summary.toBeProcessed}
                  icon={ClipboardList}
                  tone="warning"
                />
                <Tile label="Ready to Ship" value={summary.readyToShip} icon={PackageCheck} />
                <Tile label="In Transit" value={summary.inTransit} icon={Truck} />
                <Tile
                  label="Out for Delivery"
                  value={summary.outForDelivery}
                  icon={Navigation}
                  tone="accent"
                />
                <Tile
                  label="Delivered"
                  value={summary.delivered}
                  icon={CircleCheck}
                  tone="success"
                />
                <Tile label="RTO" value={summary.rto} icon={Undo2} tone="error" href="/rto" />
              </div>
              <SegmentBar
                title="Shipments by stage"
                segments={[
                  {
                    label: 'To process',
                    value: summary.toBeProcessed + summary.readyToShip,
                    tone: 'series3',
                  },
                  { label: 'In transit', value: summary.inTransit, tone: 'primary' },
                  { label: 'Out for delivery', value: summary.outForDelivery, tone: 'series2' },
                  { label: 'Returning', value: summary.rto, tone: 'error' },
                ]}
              />
            </div>
          )}
        </DetailCard>

        <DetailCard testId="ndr-card" title="NDR Details (30 days)" result={overview}>
          {({ ndr }) => {
            const closed = ndr.delivered + ndr.returned;
            return (
              <div className="grid gap-5">
                <Gauge
                  value={closed > 0 ? (ndr.delivered / closed) * 100 : 0}
                  label="Saved after a failed attempt"
                  tone="success"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Tile label="NDR Order" value={ndr.open} icon={PackageX} tone="warning" />
                  <Tile label="Re-attempted" value={ndr.reattempted} icon={RotateCw} />
                  <Tile
                    label="NDR Delivered"
                    value={ndr.delivered}
                    icon={PackageCheck}
                    tone="success"
                  />
                  <Tile
                    label="NDR Returned"
                    value={ndr.returned}
                    icon={PackageMinus}
                    tone="error"
                  />
                </div>
              </div>
            );
          }}
        </DetailCard>
      </div>
    </>
  );
}
