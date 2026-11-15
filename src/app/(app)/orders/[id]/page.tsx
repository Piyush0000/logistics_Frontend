import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { SampleBadge } from '@/components/sample-badge';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';
import { trackingService } from '@/lib/data/tracking';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { statusLabel } from '@/lib/format/status';
import { formatPaise } from '@/lib/format/money';

export const metadata: Metadata = { title: 'Shipment Detail | Evoc Ships' };

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const [detailResult, timelineResult] = await Promise.all([
    ordersService().getOrderDetail(id),
    trackingService().getTimeline(id),
  ]);

  // The gateway has no detail route, so a shipment it knows may have no shipment facts here.
  const order = detailResult.ok ? detailResult.data : null;
  const tracking = timelineResult.ok ? timelineResult.data : null;
  if (!order && !timelineResult.ok && timelineResult.error.kind === 'not_found') {
    notFound();
  }

  const timelineCard = (
    <DataCard testId="timeline-card" title="Tracking Timeline" result={timelineResult}>
      {(tracking) =>
        tracking.timeline.length === 0 ? (
          <p className="text-sm text-on-surface/70">No tracking events yet.</p>
        ) : (
          <ol className="grid gap-4">
            {tracking.timeline.map((event, index) => {
              const isLatest = index === 0;
              return (
                <li key={`${event.occurredAt}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`grid size-7 shrink-0 place-items-center rounded-full border ${
                        isLatest
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-secondary bg-tertiary text-on-surface/50'
                      }`}
                    >
                      <CheckCircle2 className="size-4" />
                    </div>
                    {index < tracking.timeline.length - 1 ? (
                      <div className="w-0.5 grow bg-secondary" />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-on-surface">
                        {statusLabel(event.status)}
                      </span>
                      {event.location ? (
                        <span className="break-words text-xs text-on-surface/60">
                          at {event.location}
                        </span>
                      ) : null}
                    </div>
                    {event.rawStatus && event.rawStatus !== statusLabel(event.status) ? (
                      <p className="mt-0.5 break-words text-xs text-on-surface/80">
                        {event.rawStatus}
                      </p>
                    ) : null}
                    <span className="mt-1 block text-[11px] text-on-surface/50">
                      {formatDateTime(event.occurredAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )
      }
    </DataCard>
  );

  return (
    <>
      <div className="grid gap-4 lg:gap-5">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Back to Orders</span>
          </Link>
          {order && detailResult.source === 'mock' ? <SampleBadge /> : null}
        </div>

        {!order ? (
          <>
            <div
              data-testid="order-header-card"
              className="flex flex-wrap items-center justify-between gap-4 motion-rise rounded-card border border-secondary bg-surface p-card"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-all font-mono text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
                    {tracking?.awb ?? id}
                  </h1>
                  {tracking ? <StatusBadge status={tracking.status} size="md" /> : null}
                </div>
                <p className="mt-1 text-xs text-on-surface/70">
                  Address and package details are not available yet.
                </p>
              </div>
              {tracking ? <CarrierBadge carrier={tracking.carrier} /> : null}
            </div>
            {timelineCard}
          </>
        ) : (
          <>
            {/* Header Card */}
            <div
              data-testid="order-header-card"
              className="flex flex-wrap items-center justify-between gap-4 motion-rise rounded-card border border-secondary bg-surface p-card"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
                    {order.awb}
                  </h1>
                  <StatusBadge status={order.status} size="md" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-on-surface/70">
                  <span>
                    Ref: <strong className="font-mono text-on-surface">{order.reference_id || 'N/A'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Created: <strong>{formatDate(order.created_at)}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CarrierBadge carrier={order.carrier} />
              </div>
            </div>

            {/* Main Content Grid: Tracking Timeline + Details */}
            <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              {/* Left Column (2 spans): Tracking Timeline & Items */}
              <div className="grid min-w-0 content-start gap-4 lg:gap-5">
                {timelineCard}

                {/* Package Items Card */}
                <div
                  data-testid="items-card"
                  className="motion-rise rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2.5 font-heading text-lg leading-7 font-bold tracking-tight">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-muted text-primary">
                      <Package aria-hidden="true" className="size-4" />
                    </span>
                    <h2>Package & Items</h2>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-control bg-tertiary/70 p-3">
                      <span className="text-on-surface/60">Weight</span>
                      <p className="font-semibold text-on-surface">{order.weight_kg} kg</p>
                    </div>
                    <div className="rounded-control bg-tertiary/70 p-3">
                      <span className="text-on-surface/60">Dimensions (L×W×H)</span>
                      <p className="font-semibold text-on-surface">
                        {order.dimensions.length_cm} × {order.dimensions.width_cm} ×{' '}
                        {order.dimensions.height_cm} cm
                      </p>
                    </div>
                    <div className="rounded-control bg-tertiary/70 p-3">
                      <span className="text-on-surface/60">Payment Mode</span>
                      <p className="font-semibold text-on-surface">{order.payment_type}</p>
                    </div>
                    <div className="rounded-control bg-tertiary/70 p-3">
                      <span className="text-on-surface/60">COD Collectable</span>
                      <p className="font-semibold text-on-surface">
                        {order.payment_type === 'COD' ? `₹${order.cod_amount}` : '₹0'}
                      </p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-secondary text-xs font-semibold tracking-wide text-on-surface/60 uppercase">
                          <th className="py-2.5 pr-3">Item Name</th>
                          <th className="py-2.5 text-center">Qty</th>
                          <th className="py-2.5 text-right">Unit Price</th>
                          <th className="py-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary/60">
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="transition-colors duration-150 hover:bg-muted/50">
                            <td className="py-2.5 font-medium">{item.name}</td>
                            <td className="py-2.5 text-center font-mono tabular-nums">{item.quantity}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums">₹{item.unit_price}</td>
                            <td className="py-2.5 text-right font-mono font-medium tabular-nums">
                              ₹{item.unit_price * item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column (1 span): Address details */}
              <div className="grid min-w-0 content-start gap-4 lg:gap-5">
                {/* Destination Address Card */}
                <div
                  data-testid="destination-card"
                  className="motion-rise rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2.5 font-heading text-lg leading-7 font-bold tracking-tight">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent/15 text-accent dark:text-primary">
                      <MapPin aria-hidden="true" className="size-4" />
                    </span>
                    <h2>Delivery Address</h2>
                  </div>
                  <div className="mt-4 text-xs leading-relaxed text-on-surface/80">
                    <p className="text-sm font-semibold text-on-surface">
                      {order.destination.name}
                    </p>
                    <p className="mt-1 font-mono text-on-surface/70">{order.destination.phone}</p>
                    <p className="mt-2 text-on-surface">{order.destination.line1}</p>
                    {order.destination.line2 ? <p>{order.destination.line2}</p> : null}
                    <p className="font-semibold text-on-surface">
                      {order.destination.city}, {order.destination.state} -{' '}
                      {order.destination.pincode}
                    </p>
                  </div>
                </div>

                {/* Origin / Pickup Address Card */}
                <div
                  data-testid="origin-card"
                  className="motion-rise rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2.5 font-heading text-lg leading-7 font-bold tracking-tight">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-muted text-primary">
                      <Truck aria-hidden="true" className="size-4" />
                    </span>
                    <h2>Pickup Warehouse</h2>
                  </div>
                  <div className="mt-4 text-xs leading-relaxed text-on-surface/80">
                    <p className="text-sm font-semibold text-on-surface">{order.origin.name}</p>
                    <p className="mt-1 font-mono text-on-surface/70">{order.origin.phone}</p>
                    <p className="mt-2 text-on-surface">{order.origin.line1}</p>
                    {order.origin.line2 ? <p>{order.origin.line2}</p> : null}
                    <p className="font-semibold text-on-surface">
                      {order.origin.city}, {order.origin.state} - {order.origin.pincode}
                    </p>
                  </div>
                </div>

                {/* Quick Info / Billing Summary */}
                <div className="motion-rise rounded-card border border-secondary bg-surface p-card text-xs">
                  <div className="flex items-center gap-2.5 font-heading text-lg leading-7 font-bold tracking-tight">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-success/15 text-success">
                      <CreditCard aria-hidden="true" className="size-4" />
                    </span>
                    <h2>Summary</h2>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface/60">Total Value</span>
                      <span className="font-mono font-medium tabular-nums">{formatPaise(order.total_amount_paise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface/60">Payment Type</span>
                      <span className="font-semibold">{order.payment_type}</span>
                    </div>
                    <div className="flex justify-between border-t border-secondary pt-2">
                      <span className="font-semibold">COD Amount</span>
                      <span className="font-mono font-semibold text-primary tabular-nums">
                        {order.payment_type === 'COD' ? `₹${order.cod_amount}` : '₹0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
