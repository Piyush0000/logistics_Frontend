import { CircleCheck, Clock, Download, TrendingUp, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SampleBadge } from '@/components/sample-badge';
import { getDemoSession } from '@/lib/auth/session';
import { codService } from '@/lib/data/cod';
import { codHref, COD_EXPORT_PATH, parseCodFilters } from '@/lib/data/cod/filters';
import { walletService } from '@/lib/data/wallet';
import { formatPaise } from '@/lib/format/money';
import { DetailCard, KpiCard } from '../../dashboard/sections';
import { RemittanceFilters } from './remittance-filters';
import { RemittanceTable } from './remittance-table';

export const metadata: Metadata = { title: 'COD Remittance | Evoc Logistics' };

const rupees = (paise: number) => formatPaise(paise, { decimals: 0 });

const EXPORT_BUTTON =
  'inline-flex h-control w-full items-center justify-center gap-2 rounded-control px-4 text-sm font-medium text-tertiary sm:w-auto';

export default async function CodRemittancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { filters, error } = parseCodFilters(await searchParams);
  const service = codService();
  const [wallet, summary, remittances] = await Promise.all([
    walletService().getBalance(),
    service.getSummary(),
    error ? null : service.listRemittances(filters),
  ]);

  const canExport = remittances?.ok && remittances.data.total > 0;

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] leading-9 font-bold lg:text-[40px] lg:leading-10">
            COD Remittance
          </h1>
          <p className="mt-1 text-sm text-on-surface/70 lg:text-base">
            Track your Cash on Delivery settlements
          </p>
        </div>
        {canExport ? (
          <a
            href={codHref(filters, { path: COD_EXPORT_PATH })}
            download
            className={`${EXPORT_BUTTON} bg-primary`}
          >
            <Download aria-hidden="true" className="size-4" />
            Export CSV
          </a>
        ) : (
          <span aria-disabled="true" className={`${EXPORT_BUTTON} bg-primary/50`}>
            <Download aria-hidden="true" className="size-4" />
            Export CSV
          </span>
        )}
      </div>

      {summary.ok ? (
        <section data-testid="cod-summary" aria-label="Summary" className="grid gap-2">
          {summary.source === 'mock' ? (
            <div className="flex justify-end">
              <SampleBadge />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:gap-5 xl:grid-cols-4">
            <KpiCard
              title="Remitted Till Date"
              value={rupees(summary.data.remittedTillDatePaise)}
              note={`${summary.data.settledCount} settled remittances`}
              icon={TrendingUp}
              tone="primary"
            />
            <KpiCard
              title="Last Remittance"
              value={rupees(summary.data.lastRemittancePaise)}
              note="Most recent settlement"
              icon={CircleCheck}
              tone="success"
            />
            <KpiCard
              title="Next Remittance (Expected)"
              value={rupees(summary.data.nextBatchPaise)}
              note={`${summary.data.nextBatchCount} orders in the next batch`}
              icon={Wallet}
              tone="accent"
            />
            <KpiCard
              title="Total Remittance Due"
              value={rupees(summary.data.totalDuePaise)}
              note={`${summary.data.dueCount} orders awaiting settlement`}
              icon={Clock}
              tone="warning"
            />
          </div>
        </section>
      ) : (
        <DetailCard testId="cod-summary" title="Summary" result={summary}>
          {() => null}
        </DetailCard>
      )}

      {/* The key resets the form's own state when Clear or the back button changes the URL. */}
      <RemittanceFilters key={codHref(filters)} filters={filters} error={error} />

      {remittances ? (
        <DetailCard testId="cod-remittances" title="Remittances" result={remittances}>
          {(page) => <RemittanceTable result={page} filters={filters} />}
        </DetailCard>
      ) : null}
    </AppShell>
  );
}
