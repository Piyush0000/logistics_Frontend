import Link from 'next/link';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { tableStyles as t } from '@/components/ui/table-styles';
import type { CodException } from '@/lib/admin/data/money';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { codBatchHref, Difference, EXCEPTION_STATUS, EXCEPTION_TYPE, LINK_BUTTON } from './cod-display';
import { ResolveExceptionButton } from './cod-dialogs';

function Outcome({ entry }: { entry: CodException }) {
  const [label, tone] = EXCEPTION_STATUS[entry.status];
  return (
    <span className="grid justify-items-start gap-1">
      <StatusChip tone={tone}>{label}</StatusChip>
      {entry.resolution ? (
        <span className="text-xs text-on-surface/70 [overflow-wrap:anywhere]">{entry.resolution.note}</span>
      ) : null}
    </span>
  );
}

/** COD exceptions with Resolve on the open ones. Tables from 1024px, cards below. */
export function ExceptionsList({ exceptions, showBatch = true }: { exceptions: CodException[]; showBatch?: boolean }) {
  if (exceptions.length === 0) return <EmptyState message="No COD exceptions. Every reconciled line matched." />;

  return (
    <>
      <div className={`${t.wrap} max-lg:hidden`}>
        <table className={t.table}>
          <thead>
            <tr>
              <th className={t.th}>AWB</th>
              {showBatch ? <th className={t.th}>Batch</th> : null}
              <th className={t.th}>Merchant</th>
              <th className={`${t.th} text-right`}>Expected</th>
              <th className={`${t.th} text-right`}>Received</th>
              <th className={`${t.th} text-right`}>Difference</th>
              <th className={t.th}>Status</th>
              <th className={t.th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((entry) => (
              <tr key={entry.id} data-testid="admin-cod-exception-row" data-exception-id={entry.id} className={t.rowHover}>
                <td className={t.td}>
                  <span className="block font-mono text-xs">{entry.awb}</span>
                  <span className="text-xs text-on-surface/60">
                    {EXCEPTION_TYPE[entry.type]} · {formatDate(entry.createdAt)}
                  </span>
                </td>
                {showBatch ? (
                  <td className={t.td}>
                    <span className="grid justify-items-start gap-1">
                      <CarrierBadge carrier={entry.carrier} />
                      <Link href={codBatchHref(entry.batchId)} className="font-mono text-xs hover:text-primary hover:underline">
                        {entry.batchId}
                      </Link>
                    </span>
                  </td>
                ) : null}
                <td className={`${t.td} text-xs`}>{entry.merchantName}</td>
                <td className={t.tdNumeric}>{formatPaise(entry.expectedPaise)}</td>
                <td className={t.tdNumeric}>{formatPaise(entry.receivedPaise)}</td>
                <td className={t.tdNumeric}>
                  <Difference paise={entry.variancePaise} />
                </td>
                <td className={`${t.td} max-w-56`}>
                  <Outcome entry={entry} />
                </td>
                <td className={`${t.td} text-right`}>
                  {/* Always mounted, so its popup survives the refresh after saving. */}
                  <ResolveExceptionButton exception={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 lg:hidden">
        {exceptions.map((entry) => (
          <li
            key={entry.id}
            data-testid="admin-cod-exception-card"
            data-exception-id={entry.id}
            className="rounded-control border border-secondary p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm [overflow-wrap:anywhere]">{entry.awb}</p>
                <p className="text-xs text-on-surface/60">
                  {EXCEPTION_TYPE[entry.type]} · {entry.merchantName}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm">
                <Difference paise={entry.variancePaise} />
              </span>
            </div>
            {showBatch ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <CarrierBadge carrier={entry.carrier} />
                <span className="font-mono">{entry.batchId}</span>
              </p>
            ) : null}
            <p className="mt-2 text-xs text-on-surface/70">
              Expected {formatPaise(entry.expectedPaise)} · Received {formatPaise(entry.receivedPaise)}
            </p>
            <div className="mt-2">
              <Outcome entry={entry} />
            </div>
            <div className="mt-3 flex gap-2 empty:hidden">
              {showBatch ? (
                <Link href={codBatchHref(entry.batchId)} className={`${LINK_BUTTON} flex-1`}>
                  Batch
                </Link>
              ) : null}
              <ResolveExceptionButton exception={entry} wide />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
