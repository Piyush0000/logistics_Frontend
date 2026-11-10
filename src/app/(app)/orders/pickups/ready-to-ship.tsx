'use client';

import { useState } from 'react';
import { CarrierBadge, carrierLabel } from '@/components/orders/carrier-badge';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { OrderSummary } from '@/lib/data/orders/types';
import type { PickupAddress } from '@/lib/data/pickup-addresses/types';
import { hasMixedCarriers } from '@/lib/data/pickups/input';
import { ONE_COURIER_MESSAGE } from '@/lib/data/pickups/types';
import { formatDate } from '@/lib/format/date';
import { ScheduleDialog } from './schedule-dialog';

const CHECKBOX = 'size-5 shrink-0 accent-primary';

/**
 * The shipments a courier can collect, with checkboxes. When `addresses` and scheduling are not
 * offered (`canSchedule` false) the list is shown without them.
 */
export function ReadyToShip({
  orders,
  canSchedule,
  addresses,
  today,
}: {
  orders: OrderSummary[];
  canSchedule: boolean;
  addresses: PickupAddress[] | null;
  /** Today in Indian time, as YYYY-MM-DD. */
  today: string;
}) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (orders.length === 0) {
    return <EmptyState message="No shipments are ready to ship. Shipments appear here once they are manifested." />;
  }

  // The list can change under a selection, for example after a pickup is made.
  const selected = orders.filter((order) => picked.has(order.awb));
  const allSelected = selected.length === orders.length;

  function change(next: ReadonlySet<string>) {
    setPicked(next);
    setMessage(null);
  }

  function toggle(awb: string, on: boolean) {
    const next = new Set(picked);
    if (on) next.add(awb);
    else next.delete(awb);
    change(next);
  }

  function schedule() {
    if (hasMixedCarriers(selected.map((order) => order.carrier))) {
      setMessage(ONE_COURIER_MESSAGE);
      return;
    }
    setNotice(null);
    setOpen(true);
  }

  return (
    <div className="grid gap-4">
      {notice ? (
        <p role="status" className="rounded-control bg-success/15 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      {canSchedule ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium lg:min-h-0">
            <input
              type="checkbox"
              aria-label="Select all shipments"
              checked={allSelected}
              onChange={(event) =>
                change(event.target.checked ? new Set(orders.map((order) => order.awb)) : new Set())
              }
              className={CHECKBOX}
            />
            <span aria-hidden="true">Select all</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-on-surface/70">{selected.length} selected</p>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={schedule}
              className={`${PRIMARY_BUTTON} max-lg:h-11`}
            >
              Schedule pickup
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
          {message}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
              {canSchedule ? (
                <th className="w-12 py-3.5 pr-2 pl-6">
                  <span className="sr-only">Select</span>
                </th>
              ) : null}
              <th className={`py-3.5 pr-4 ${canSchedule ? 'pl-2' : 'pl-6'}`}>AWB / Reference</th>
              <th className="px-4 py-3.5">Courier</th>
              <th className="py-3.5 pr-6 pl-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary">
            {orders.map((order) => (
              <tr key={order.shipment_id} data-testid="ready-row" className="hover:bg-tertiary/40">
                {canSchedule ? (
                  <td className="py-4 pr-2 pl-6">
                    <input
                      type="checkbox"
                      aria-label={`Select ${order.awb}`}
                      checked={picked.has(order.awb)}
                      onChange={(event) => toggle(order.awb, event.target.checked)}
                      className={CHECKBOX}
                    />
                  </td>
                ) : null}
                <td className={`py-4 pr-4 ${canSchedule ? 'pl-2' : 'pl-6'}`}>
                  <span className="font-mono text-sm font-semibold [overflow-wrap:anywhere] text-primary">
                    {order.awb}
                  </span>
                  <div className="text-xs text-on-surface/60 [overflow-wrap:anywhere]">
                    Ref: {order.reference_id || 'N/A'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <CarrierBadge carrier={order.carrier} />
                </td>
                <td className="py-4 pr-6 pl-4 text-xs text-on-surface/70">
                  {formatDate(order.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {orders.map((order) => {
          const content = (
            <>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-mono text-sm font-bold [overflow-wrap:anywhere] text-primary">
                  {order.awb}
                </span>
                <span className="text-xs text-on-surface/60 [overflow-wrap:anywhere]">
                  Ref: {order.reference_id || 'N/A'}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface/70">
                  <CarrierBadge carrier={order.carrier} />
                  {formatDate(order.created_at)}
                </span>
              </div>
            </>
          );
          const frame =
            'flex min-h-11 items-start gap-3 rounded-card border border-secondary bg-surface p-4';
          return canSchedule ? (
            <label key={order.shipment_id} data-testid="ready-item" className={`${frame} has-[:checked]:border-primary`}>
              <input
                type="checkbox"
                aria-label={`Select ${order.awb}`}
                checked={picked.has(order.awb)}
                onChange={(event) => toggle(order.awb, event.target.checked)}
                className={`${CHECKBOX} mt-0.5`}
              />
              {content}
            </label>
          ) : (
            <div key={order.shipment_id} data-testid="ready-item" className={frame}>
              {content}
            </div>
          );
        })}
      </div>

      {open ? (
        <ScheduleDialog
          awbs={selected.map((order) => order.awb)}
          carrierLabel={carrierLabel(selected[0]?.carrier ?? '')}
          today={today}
          addresses={addresses}
          onClose={() => setOpen(false)}
          onScheduled={(pickupId) => {
            setOpen(false);
            setPicked(new Set());
            setNotice(`Pickup ${pickupId} scheduled.`);
          }}
        />
      ) : null}
    </div>
  );
}
