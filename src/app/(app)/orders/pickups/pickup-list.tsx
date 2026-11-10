import { ChevronRight, Printer } from 'lucide-react';
import Link from 'next/link';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { PICKUP_STATUS_LABELS, formatPickupWindow, shipmentCount } from '@/lib/data/pickups/format';
import type { Pickup } from '@/lib/data/pickups/types';
import { formatDate } from '@/lib/format/date';

const STATUS_STYLES: Record<Pickup['status'], string> = {
  scheduled: 'bg-muted text-primary',
  picked_up: 'bg-success/15',
  cancelled: 'bg-error/10',
};

function PickupStatus({ status }: { status: Pickup['status'] }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium ${STATUS_STYLES[status]}`}
    >
      {PICKUP_STATUS_LABELS[status]}
    </span>
  );
}

const manifestHref = (pickup: Pickup) =>
  `/orders/pickups/manifest-print/${encodeURIComponent(pickup.id)}`;

export function PickupTable({ pickups }: { pickups: Pickup[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
            <th className="py-3.5 pr-4 pl-6">Date</th>
            <th className="px-4 py-3.5">Window</th>
            <th className="px-4 py-3.5">Courier</th>
            <th className="px-4 py-3.5">Address</th>
            <th className="px-4 py-3.5">Shipments</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="py-3.5 pr-6 pl-4 text-right">Manifest</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary">
          {pickups.map((pickup) => (
            <tr key={pickup.id} data-testid="pickup-row" className="hover:bg-tertiary/40">
              <td className="py-4 pr-4 pl-6 whitespace-nowrap">{formatDate(pickup.pickupDate)}</td>
              <td className="px-4 py-4 whitespace-nowrap">{formatPickupWindow(pickup.window)}</td>
              <td className="px-4 py-4">
                <CarrierBadge carrier={pickup.carrier} />
              </td>
              <td className="max-w-64 px-4 py-4 [overflow-wrap:anywhere]">{pickup.addressLabel}</td>
              <td className="px-4 py-4 whitespace-nowrap">{shipmentCount(pickup.awbs.length)}</td>
              <td className="px-4 py-4">
                <PickupStatus status={pickup.status} />
              </td>
              <td className="py-4 pr-6 pl-4 text-right">
                <Link
                  href={manifestHref(pickup)}
                  className="inline-flex h-8 items-center gap-1 rounded-control border border-secondary bg-surface px-2.5 text-xs font-medium whitespace-nowrap hover:border-primary hover:text-primary"
                >
                  <Printer aria-hidden="true" className="size-3" />
                  Print manifest
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function PickupCards({ pickups }: { pickups: Pickup[] }) {
  return (
    <div className="grid gap-3 lg:hidden">
      {pickups.map((pickup) => (
        <article
          key={pickup.id}
          data-testid="pickup-item"
          className="grid gap-3 rounded-card border border-secondary bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold">{formatDate(pickup.pickupDate)}</p>
              <p className="text-xs text-on-surface/60">{formatPickupWindow(pickup.window)}</p>
            </div>
            <PickupStatus status={pickup.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="min-w-0">
              <dt className="mb-0.5 text-xs text-on-surface/60">Courier</dt>
              <dd>
                <CarrierBadge carrier={pickup.carrier} />
              </dd>
            </div>
            <Fact label="Shipments" value={shipmentCount(pickup.awbs.length)} />
            <div className="col-span-2">
              <Fact label="Address" value={pickup.addressLabel} />
            </div>
          </dl>
          <Link
            href={manifestHref(pickup)}
            className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-secondary px-3 text-sm font-medium hover:border-primary hover:text-primary"
          >
            <span className="inline-flex items-center gap-2">
              <Printer aria-hidden="true" className="size-4" />
              Print manifest
            </span>
            <ChevronRight aria-hidden="true" className="size-4 text-on-surface/40" />
          </Link>
        </article>
      ))}
    </div>
  );
}
