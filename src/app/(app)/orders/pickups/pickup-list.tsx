import { ChevronRight, Printer } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { tableStyles } from '@/components/ui/table-styles';
import { PICKUP_STATUS_LABELS, formatPickupWindow, shipmentCount } from '@/lib/data/pickups/format';
import type { Pickup } from '@/lib/data/pickups/types';
import { formatDate } from '@/lib/format/date';

const STATUS_STYLES: Record<Pickup['status'], string> = {
  scheduled: 'bg-muted text-primary',
  picked_up: 'bg-success/15 text-success',
  cancelled: 'bg-error/15 text-error',
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
    <div className={`${tableStyles.wrap} hidden lg:block`}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th className={tableStyles.th}>Date</th>
            <th className={tableStyles.th}>Window</th>
            <th className={tableStyles.th}>Courier</th>
            <th className={tableStyles.th}>Address</th>
            <th className={`${tableStyles.th} text-right`}>Shipments</th>
            <th className={tableStyles.th}>Status</th>
            <th className={`${tableStyles.th} text-right`}>Manifest</th>
          </tr>
        </thead>
        <tbody>
          {pickups.map((pickup) => (
            <tr key={pickup.id} data-testid="pickup-row" className={tableStyles.rowHover}>
              <td className={`${tableStyles.td} whitespace-nowrap`}>{formatDate(pickup.pickupDate)}</td>
              <td className={`${tableStyles.td} whitespace-nowrap text-on-surface/70`}>{formatPickupWindow(pickup.window)}</td>
              <td className={tableStyles.td}>
                <CarrierBadge carrier={pickup.carrier} />
              </td>
              <td className={`${tableStyles.td} max-w-64 [overflow-wrap:anywhere]`}>{pickup.addressLabel}</td>
              <td className={`${tableStyles.tdNumeric} whitespace-nowrap`}>{shipmentCount(pickup.awbs.length)}</td>
              <td className={tableStyles.td}>
                <PickupStatus status={pickup.status} />
              </td>
              <td className={`${tableStyles.td} text-right`}>
                <Link
                  href={manifestHref(pickup)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-secondary bg-surface px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 hover:border-primary/40 hover:bg-muted hover:text-primary"
                >
                  <Printer aria-hidden="true" className="size-3.5" />
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
    <div className="motion-stagger grid gap-3 lg:hidden">
      {pickups.map((pickup, index) => (
        <article
          key={pickup.id}
          data-testid="pickup-item"
          style={{ '--i': index } as CSSProperties}
          className="grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading text-base leading-6 font-bold tracking-tight">{formatDate(pickup.pickupDate)}</p>
              <p className="text-xs text-on-surface/60">{formatPickupWindow(pickup.window)}</p>
            </div>
            <PickupStatus status={pickup.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-control bg-tertiary p-3 text-sm">
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
            className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-secondary px-3 text-sm font-medium transition-colors duration-150 hover:border-primary/40 hover:bg-muted hover:text-primary"
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
