import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  ADMIN_WEIGHT_STATUSES,
  adminWeightService,
  type AdminDiscrepancy,
  type AdminWeightStatus,
} from '@/lib/admin/data/weight';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { LINK_BUTTON } from '../cod/cod-display';
import { RecordWeightsButton, ResolveWeightButton } from './weight-dialogs';

export const metadata: Metadata = { title: 'Weight disputes' };

const TABS: Record<AdminWeightStatus, string> = {
  disputed: 'To decide',
  open: 'Waiting on merchant',
  accepted: 'Accepted',
  resolved: 'Decided',
};

const kg = (grams: number) => `${(grams / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`;

function outcome(d: AdminDiscrepancy): [string, ChipTone] {
  if (d.status === 'disputed') return ['Disputed', 'warning'];
  if (d.status === 'open') return [`Answer by ${formatDate(d.respondBy)}`, 'info'];
  if (d.outcome === 'merchant_cleared') return ['Merchant cleared', 'success'];
  return [d.chargedPaise > 0 ? `Charged ${formatPaise(d.chargedPaise)}` : 'Charge pending', d.chargedPaise > 0 ? 'neutral' : 'error'];
}

const href = (status: AdminWeightStatus, page = 1, q = '') => {
  const params = new URLSearchParams({ status });
  if (page > 1) params.set('page', String(page));
  if (q) params.set('q', q);
  return `/admin/money/weight?${params}`;
};

export default async function AdminWeightPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const status = ADMIN_WEIGHT_STATUSES.find((s) => s === params.status) ?? 'disputed';
  const page = typeof params.page === 'string' && /^\d{1,4}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 40) : '';
  const result = await adminWeightService().list({ status, q, page });

  return (
    <>
      <PageHeader
        title="Weight disputes"
        description="Courier charges for more weight than merchants declared. Upload the courier's file; merchants accept or dispute within 7 days, and you decide disputes."
        actions={<RecordWeightsButton />}
      />

      <nav aria-label="Weight dispute status" className="flex flex-wrap gap-2">
        {ADMIN_WEIGHT_STATUSES.map((s) => (
          <Link
            key={s}
            href={href(s, 1, q)}
            aria-current={s === status ? 'page' : undefined}
            className={`${LINK_BUTTON} ${s === status ? 'border-primary bg-primary/10 text-primary' : ''}`}
          >
            {TABS[s]}
          </Link>
        ))}
        <form action="/admin/money/weight" className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <label htmlFor="weight-q" className="sr-only">
            Search by AWB
          </label>
          <input
            id="weight-q"
            name="q"
            defaultValue={q}
            placeholder="Evoc or courier AWB"
            className="h-11 w-48 rounded-control border border-secondary bg-surface px-3 text-sm lg:h-control"
          />
          <button type="submit" className={LINK_BUTTON}>
            Search
          </button>
        </form>
      </nav>

      <DataCard testId="admin-weight" title={TABS[status]} result={result}>
        {({ items, pageCount, total }) =>
          items.length === 0 ? (
            <EmptyState message={status === 'disputed' ? 'No disputes to decide.' : 'Nothing here.'} />
          ) : (
            <div className="grid gap-4">
              <ul className="grid gap-3">
                {items.map((d) => {
                  const [label, tone] = outcome(d);
                  return (
                    <li key={d.id} data-testid="admin-weight-row" className="rounded-control border border-secondary p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold [overflow-wrap:anywhere]">{d.merchantName}</p>
                          <p className="font-mono text-xs text-on-surface/70">
                            {d.awb} · courier AWB {d.carrierAwb}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CarrierBadge carrier={d.carrier} />
                          <StatusChip tone={tone}>{label}</StatusChip>
                        </div>
                      </div>
                      <p className="mt-2 text-sm">
                        Declared {kg(d.declaredGrams)}, courier charged {kg(d.chargedGrams)}:{' '}
                        <span className="font-mono font-semibold">{formatPaise(d.extraChargePaise)}</span> extra. Raised{' '}
                        {formatDate(d.raisedAt)}.
                      </p>
                      {d.disputeNote ? (
                        <blockquote className="mt-2 rounded-control bg-tertiary p-2 text-sm">
                          <span className="font-medium">Merchant:</span> {d.disputeNote}
                          {d.evidence.length ? (
                            <span className="block text-xs text-on-surface/70">
                              Evidence named: {d.evidence.map((e) => e.name).join(', ')}. Ask the merchant to email the
                              images if you need them.
                            </span>
                          ) : null}
                        </blockquote>
                      ) : null}
                      {d.resolutionNote ? (
                        <p className="mt-2 text-sm text-on-surface/80">
                          <span className="font-medium">Decision:</span> {d.resolutionNote}
                        </p>
                      ) : null}
                      {d.status === 'disputed' ? (
                        <div className="mt-3">
                          <ResolveWeightButton discrepancy={d} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between gap-3 text-sm text-on-surface/70">
                <span>
                  {total} {total === 1 ? 'charge' : 'charges'}
                </span>
                <span className="flex gap-2">
                  {page > 1 ? (
                    <Link href={href(status, page - 1, q)} className={LINK_BUTTON}>
                      Previous
                    </Link>
                  ) : null}
                  {page < pageCount ? (
                    <Link href={href(status, page + 1, q)} className={LINK_BUTTON}>
                      Next
                    </Link>
                  ) : null}
                </span>
              </div>
            </div>
          )
        }
      </DataCard>
    </>
  );
}
