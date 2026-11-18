import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Scale,
  Store,
  User,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminLoadError } from '@/components/admin/load-error';
import { notFound } from 'next/navigation';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { DataCard } from '@/components/ui/data-card';
import { adminShipmentsService } from '@/lib/admin/data/shipments';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { AdminTrackingTimeline } from './tracking-timeline';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ awb: string }>;
}): Promise<Metadata> {
  const { awb } = await params;
  return { title: `Shipment ${awb} | Admin Shipments` };
}

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminShipmentDetailPage({
  params,
}: {
  params: Promise<{ awb: string }>;
}) {
  await requireAdminSession();
  const { awb } = await params;

  const result = await adminShipmentsService().getShipment(awb);
  if (!result.ok) {
    if (result.error.kind === 'not_found') {
      notFound();
    }
    // Backend unavailable or another error: show it on the page instead of crashing to the global error page.
    return <AdminLoadError title={`Shipment ${awb}`} testId="admin-shipment-error" result={result} />;
  }

  const shipment = result.data;

  return (
    <div className="grid gap-4 lg:gap-5" data-testid="admin-shipment-detail">
      {/* Back to shipments */}
      <div>
        <Link
          href="/admin/shipments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          <span>Back to shipments</span>
        </Link>
      </div>

      {/* Header section */}
      <section className="motion-rise rounded-card border border-secondary bg-surface p-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface/50">
                AWB Tracking
              </span>
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-[11px] text-on-surface/70">
                {shipment.carrier}
              </span>
            </div>
            <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {shipment.awb}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-on-surface/60">
                Booked {formatDateTime(shipment.createdAt)}
              </span>
              <span className="text-on-surface/30">·</span>
              <span className="text-on-surface/60">
                Last event {formatDateTime(shipment.lastEventAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CarrierBadge carrier={shipment.carrier} />
            <StatusBadge status={shipment.status} />
            {shipment.stuck ? (
              <StatusChip tone="warning">Stuck in transit</StatusChip>
            ) : null}
          </div>
        </div>
      </section>

      {/* Main Grid: Details + Timeline */}
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start">
        {/* Left Column: Shipment & Merchant Info */}
        <div className="grid gap-4 lg:gap-5">
          {/* Merchant Info Card */}
          <DataCard
            testId="admin-shipment-merchant"
            title="Merchant"
            result={result}
            actions={
              <Link
                href={`/admin/merchants/${shipment.merchantId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Merchant account</span>
                <ExternalLink aria-hidden="true" className="size-3" />
              </Link>
            }
          >
            {() => (
              <div className="flex items-center justify-between rounded-control border border-secondary/60 bg-tertiary/40 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-control bg-primary/10 text-primary">
                    <Store aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <div className="font-heading text-sm font-bold text-on-surface">
                      {shipment.merchantName}
                    </div>
                    <div className="font-mono text-xs text-on-surface/60">
                      ID: {shipment.merchantId}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/admin/shipments?merchantId=${shipment.merchantId}`}
                  className="rounded-control bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-tertiary"
                >
                  All shipments &rarr;
                </Link>
              </div>
            )}
          </DataCard>

          {/* Shipment Package & Route Details */}
          <DataCard
            testId="admin-shipment-package"
            title="Package & Route details"
            result={result}
          >
            {() => (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Route */}
                <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3 sm:col-span-2">
                  <span className="text-xs text-on-surface/60">Transit Route</span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3.5 text-on-surface/50" />
                      {shipment.origin}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-primary" />
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                      {shipment.destination}
                    </span>
                  </div>
                </div>

                {/* Recipient */}
                <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <span className="text-xs text-on-surface/60">Recipient</span>
                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-on-surface">
                    <User aria-hidden="true" className="size-3.5 text-on-surface/50" />
                    <span>{shipment.recipientName}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-on-surface/60">
                    <Phone aria-hidden="true" className="size-3 text-on-surface/40" />
                    <span>{shipment.recipientPhone}</span>
                  </div>
                </div>

                {/* Weight */}
                <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <span className="text-xs text-on-surface/60">Package Weight</span>
                  <div className="mt-0.5 flex items-center gap-1 font-mono font-semibold text-on-surface">
                    <Scale aria-hidden="true" className="size-3.5 text-on-surface/50" />
                    <span>{(shipment.weightGrams / 1000).toFixed(2)} kg</span>
                  </div>
                  <div className="text-[11px] text-on-surface/50">
                    {shipment.weightGrams.toLocaleString('en-IN')} g
                  </div>
                </div>

                {/* Payment Type */}
                <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <span className="text-xs text-on-surface/60">Payment Type</span>
                  <div className="mt-0.5 font-semibold text-on-surface">
                    {shipment.codAmountPaise !== undefined ? 'Cash on Delivery (COD)' : 'Prepaid'}
                  </div>
                  {shipment.codAmountPaise !== undefined ? (
                    <div className="font-mono text-xs font-bold text-primary">
                      {formatPaise(shipment.codAmountPaise)}
                    </div>
                  ) : null}
                </div>

                {/* Carrier Service */}
                <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <span className="text-xs text-on-surface/60">Courier Service</span>
                  <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-on-surface">
                    <Package aria-hidden="true" className="size-3.5 text-on-surface/50" />
                    <span>{shipment.carrier} Surface Standard</span>
                  </div>
                </div>
              </div>
            )}
          </DataCard>
        </div>

        {/* Right Column: Tracking Timeline */}
        <DataCard
          testId="admin-shipment-timeline-card"
          title={`Tracking Timeline (${shipment.timeline.length} events)`}
          result={result}
        >
          {() => <AdminTrackingTimeline events={shipment.timeline} />}
        </DataCard>
      </div>
    </div>
  );
}
