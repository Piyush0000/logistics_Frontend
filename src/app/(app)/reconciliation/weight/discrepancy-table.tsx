'use client';

import { useState, useTransition } from 'react';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { isResponseWindowClosed } from '@/lib/data/weight/input';
import type { WeightDiscrepancy } from '@/lib/data/weight/types';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { acceptDiscrepancyAction } from './actions';
import { DiscrepancyStatusBadge } from './discrepancy-status';
import { DisputeDialog } from './dispute-dialog';

const kg = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`;

const TABLE_BUTTON =
  'inline-flex h-8 items-center rounded-control border px-2.5 text-xs font-medium whitespace-nowrap disabled:opacity-50';
const CARD_BUTTON =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-control border px-4 text-sm font-medium disabled:opacity-50';
const ACCEPT = 'border-secondary bg-surface hover:border-primary hover:text-primary';
const DISPUTE = 'border-primary bg-primary text-on-primary';

interface RowProps {
  item: WeightDiscrepancy;
  closed: boolean;
  busy: boolean;
  onAccept: (item: WeightDiscrepancy) => void;
  onDispute: (item: WeightDiscrepancy) => void;
}

/** Accept and Dispute for an open row. Past the response window only Accept is left. */
function Actions({ item, closed, busy, onAccept, onDispute, layout }: RowProps & { layout: 'table' | 'card' }) {
  if (item.status !== 'open') {
    return <span className="text-sm text-on-surface/60">No action needed</span>;
  }
  const size = layout === 'table' ? TABLE_BUTTON : CARD_BUTTON;

  return (
    <div className={layout === 'table' ? 'flex flex-wrap items-center justify-end gap-2' : 'grid gap-2'}>
      {closed ? (
        <span className="text-xs font-medium text-on-surface/70">Response window closed</span>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept(item)}
          className={`${size} ${ACCEPT}`}
        >
          Accept<span className="sr-only"> charge for {item.awb}</span>
        </button>
        {closed ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDispute(item)}
            className={`${size} ${DISPUTE}`}
          >
            Dispute<span className="sr-only"> charge for {item.awb}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className={`[overflow-wrap:anywhere] ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

/**
 * The discrepancies as a table on desktop and cards on phones, with the accept and dispute
 * actions. `now` comes from the server, so a row's window reads the same on both sides.
 */
export function DiscrepancyList({ items, now }: { items: WeightDiscrepancy[]; now: string }) {
  const [disputing, setDisputing] = useState<WeightDiscrepancy | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const clock = new Date(now);

  function accept(item: WeightDiscrepancy) {
    setNotice(null);
    setError(null);
    startTransition(async () => {
      const result = await acceptDiscrepancyAction(item.id);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
    });
  }

  function dispute(item: WeightDiscrepancy) {
    setNotice(null);
    setError(null);
    setDisputing(item);
  }

  const rowProps = (item: WeightDiscrepancy): RowProps => ({
    item,
    closed: isResponseWindowClosed(item.respondBy, clock),
    busy: pending,
    onAccept: accept,
    onDispute: dispute,
  });

  return (
    <div className="grid gap-4">
      {notice ? (
        <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
        <table aria-label="Weight discrepancies" className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
              <th scope="col" className="py-3.5 pr-4 pl-6">AWB</th>
              <th scope="col" className="px-4 py-3.5">Courier</th>
              <th scope="col" className="px-4 py-3.5 text-right">Declared</th>
              <th scope="col" className="px-4 py-3.5 text-right">Charged</th>
              <th scope="col" className="px-4 py-3.5 text-right">Extra charge</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-4 py-3.5">Respond by</th>
              <th scope="col" className="py-3.5 pr-6 pl-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary">
            {items.map((item) => (
              <tr key={item.id} data-testid="weight-row" className="hover:bg-tertiary/40">
                <td className="max-w-56 py-4 pr-4 pl-6 font-medium [overflow-wrap:anywhere]">{item.awb}</td>
                <td className="px-4 py-4">
                  <CarrierBadge carrier={item.carrier} />
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap tabular-nums">{kg(item.declaredKg)}</td>
                <td className="px-4 py-4 text-right whitespace-nowrap tabular-nums">{kg(item.chargedKg)}</td>
                <td className="px-4 py-4 text-right font-medium whitespace-nowrap tabular-nums">
                  {formatPaise(item.extraChargePaise)}
                </td>
                <td className="px-4 py-4">
                  <DiscrepancyStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">{formatDate(item.respondBy)}</td>
                <td className="py-4 pr-6 pl-4 text-right">
                  <Actions {...rowProps(item)} layout="table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <article
            key={item.id}
            data-testid="weight-item"
            className="grid gap-3 rounded-card border border-secondary bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid min-w-0 gap-1.5">
                <p className="text-sm font-bold [overflow-wrap:anywhere]">{item.awb}</p>
                <div>
                  <CarrierBadge carrier={item.carrier} />
                </div>
              </div>
              <DiscrepancyStatusBadge status={item.status} />
            </div>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-3 gap-y-2 text-sm">
              <Fact label="Declared" value={kg(item.declaredKg)} />
              <Fact label="Charged" value={kg(item.chargedKg)} />
              <Fact label="Extra charge" value={formatPaise(item.extraChargePaise)} strong />
              <Fact label="Respond by" value={formatDate(item.respondBy)} />
            </dl>
            <Actions {...rowProps(item)} layout="card" />
          </article>
        ))}
      </div>

      {disputing ? (
        <DisputeDialog
          item={disputing}
          onClose={() => setDisputing(null)}
          onDisputed={(message) => {
            setDisputing(null);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}
