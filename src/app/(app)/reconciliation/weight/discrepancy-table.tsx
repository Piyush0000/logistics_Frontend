'use client';

import { useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { tableStyles } from '@/components/ui/table-styles';
import { isResponseWindowClosed } from '@/lib/data/weight/input';
import type { WeightDiscrepancy } from '@/lib/data/weight/types';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { acceptDiscrepancyAction } from './actions';
import { DiscrepancyStatusBadge } from './discrepancy-status';
import { DisputeDialog } from './dispute-dialog';

const kg = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`;

const TABLE_BUTTON =
  'inline-flex h-8 items-center rounded-control border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50';
const CARD_BUTTON =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-control border px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-50';
const ACCEPT = 'border-secondary bg-surface hover:border-primary/40 hover:bg-muted hover:text-primary';
const DISPUTE = 'border-primary bg-primary text-on-primary hover:border-accent hover:bg-accent';

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
      <dd className={`[overflow-wrap:anywhere] ${strong ? 'font-mono font-semibold tabular-nums' : 'font-medium'}`}>
        {value}
      </dd>
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
        <p role="status" className="rounded-control border border-success/30 bg-success/10 p-3 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control border border-error/30 bg-error/10 p-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className={`${tableStyles.wrap} hidden lg:block`}>
        <table aria-label="Weight discrepancies" className={tableStyles.table}>
          <thead>
            <tr>
              <th scope="col" className={tableStyles.th}>AWB</th>
              <th scope="col" className={tableStyles.th}>Courier</th>
              <th scope="col" className={`${tableStyles.th} text-right`}>Declared</th>
              <th scope="col" className={`${tableStyles.th} text-right`}>Charged</th>
              <th scope="col" className={`${tableStyles.th} text-right`}>Extra charge</th>
              <th scope="col" className={tableStyles.th}>Status</th>
              <th scope="col" className={tableStyles.th}>Respond by</th>
              <th scope="col" className={`${tableStyles.th} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                data-testid="weight-row"
                className={`${tableStyles.rowHover} [&:last-child>td]:border-b-0`}
              >
                <td className={`${tableStyles.td} max-w-56 font-mono text-[13px] font-semibold [overflow-wrap:anywhere]`}>
                  {item.awb}
                </td>
                <td className={tableStyles.td}>
                  <CarrierBadge carrier={item.carrier} />
                </td>
                <td className={`${tableStyles.tdNumeric} whitespace-nowrap`}>{kg(item.declaredKg)}</td>
                <td className={`${tableStyles.tdNumeric} whitespace-nowrap`}>{kg(item.chargedKg)}</td>
                <td className={`${tableStyles.tdNumeric} font-semibold whitespace-nowrap`}>
                  {formatPaise(item.extraChargePaise)}
                </td>
                <td className={tableStyles.td}>
                  <DiscrepancyStatusBadge status={item.status} />
                </td>
                <td className={`${tableStyles.td} whitespace-nowrap`}>{formatDate(item.respondBy)}</td>
                <td className={`${tableStyles.td} text-right`}>
                  <Actions {...rowProps(item)} layout="table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="motion-stagger grid gap-3 lg:hidden">
        {items.map((item, index) => (
          <article
            key={item.id}
            data-testid="weight-item"
            style={{ '--i': index } as CSSProperties}
            className="grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid min-w-0 gap-1.5">
                <p className="font-mono text-sm font-bold [overflow-wrap:anywhere] text-primary">{item.awb}</p>
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
