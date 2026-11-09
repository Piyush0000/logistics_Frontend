import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SampleBadge } from '@/components/sample-badge';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';
import { walletService } from '@/lib/data/wallet';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

export const metadata: Metadata = { title: 'Shipment Detail | Evoc Logistics' };

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const [wallet, detailResult] = await Promise.all([
    walletService().getBalance(),
    ordersService().getOrderDetail(id),
  ]);

  if (!detailResult.ok) {
    if (detailResult.error.kind === 'not_found') {
      notFound();
    }
  }

  const order = detailResult.ok ? detailResult.data : null;

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Orders</span>
          </Link>
          <SampleBadge />
        </div>

        {!order ? (
          <div
            data-testid="order-detail-error"
            className="rounded-card border border-error/30 bg-error/10 p-6 text-center text-error"
          >
            <p className="font-semibold">Failed to load shipment details</p>
            <p className="mt-1 text-xs">{detailResult.ok ? '' : detailResult.error.message}</p>
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div
              data-testid="order-header-card"
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-secondary bg-surface p-card"
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
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column (2 spans): Tracking Timeline & Items */}
              <div className="grid gap-6 lg:col-span-2">
                {/* Timeline Card */}
                <div
                  data-testid="timeline-card"
                  className="rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
                    <Clock className="size-5 text-primary" />
                    <h2>Tracking Timeline</h2>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {order.timeline.map((event, index) => {
                      const isLatest = index === order.timeline.length - 1;
                      return (
                        <div key={index} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`grid size-7 shrink-0 place-items-center rounded-full border ${
                                isLatest
                                  ? 'border-primary bg-primary text-tertiary'
                                  : 'border-secondary bg-tertiary text-on-surface/50'
                              }`}
                            >
                              <CheckCircle2 className="size-4" />
                            </div>
                            {index < order.timeline.length - 1 ? (
                              <div className="w-0.5 grow bg-secondary" />
                            ) : null}
                          </div>
                          <div className="pb-4">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-sm font-semibold text-on-surface">
                                {event.status}
                              </span>
                              {event.location ? (
                                <span className="text-xs text-on-surface/60">
                                  at {event.location}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-on-surface/80">{event.description}</p>
                            <span className="mt-1 block text-[11px] text-on-surface/50">
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Package Items Card */}
                <div
                  data-testid="items-card"
                  className="rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
                    <Package className="size-5 text-primary" />
                    <h2>Package & Items</h2>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-b border-secondary pb-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-on-surface/60">Weight</span>
                      <p className="font-semibold text-on-surface">{order.weight_kg} kg</p>
                    </div>
                    <div>
                      <span className="text-on-surface/60">Dimensions (L×W×H)</span>
                      <p className="font-semibold text-on-surface">
                        {order.dimensions.length_cm} × {order.dimensions.width_cm} ×{' '}
                        {order.dimensions.height_cm} cm
                      </p>
                    </div>
                    <div>
                      <span className="text-on-surface/60">Payment Mode</span>
                      <p className="font-semibold text-on-surface">{order.payment_type}</p>
                    </div>
                    <div>
                      <span className="text-on-surface/60">COD Collectable</span>
                      <p className="font-semibold text-on-surface">
                        {order.payment_type === 'COD' ? `₹${order.cod_amount}` : '₹0'}
                      </p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-secondary text-on-surface/60">
                          <th className="pb-2">Item Name</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary/60">
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="py-2">
                            <td className="py-2.5 font-medium">{item.name}</td>
                            <td className="py-2.5 text-center">{item.quantity}</td>
                            <td className="py-2.5 text-right">₹{item.unit_price}</td>
                            <td className="py-2.5 text-right font-semibold">
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
              <div className="grid gap-6">
                {/* Destination Address Card */}
                <div
                  data-testid="destination-card"
                  className="rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
                    <MapPin className="size-5 text-accent" />
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
                  className="rounded-card border border-secondary bg-surface p-card"
                >
                  <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
                    <Truck className="size-5 text-primary" />
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
                <div className="rounded-card border border-secondary bg-surface p-card text-xs">
                  <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
                    <CreditCard className="size-5 text-success" />
                    <h2>Summary</h2>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface/60">Total Value</span>
                      <span className="font-semibold">{formatPaise(order.total_amount_paise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface/60">Payment Type</span>
                      <span className="font-semibold">{order.payment_type}</span>
                    </div>
                    <div className="flex justify-between border-t border-secondary pt-2">
                      <span className="font-semibold">COD Amount</span>
                      <span className="font-bold text-primary">
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
    </AppShell>
  );
}
