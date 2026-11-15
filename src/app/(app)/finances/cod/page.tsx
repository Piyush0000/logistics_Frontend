import { CircleCheck, Clock, Download, TrendingUp, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SampleBadge } from '@/components/sample-badge';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { codService } from '@/lib/data/cod';
import { codHref, COD_EXPORT_PATH, parseCodFilters } from '@/lib/data/cod/filters';
import { formatPaise } from '@/lib/format/money';
import { KpiCard } from '../../dashboard/sections';
import { RemittanceFilters } from './remittance-filters';
import { RemittanceTable } from './remittance-table';

export const metadata: Metadata = { title: 'COD Remittance | Evoc Ships' };

const rupees = (paise: number) => formatPaise(paise, { decimals: 0 });

const EXPORT_BUTTON =
  'inline-flex h-control w-full items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold text-on-primary transition-colors duration-150 sm:w-auto';

export default async function CodRemittancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { filters, error } = parseCodFilters(await searchParams);
  const service = codService();
  const [summary, remittances] = await Promise.all([
    service.getSummary(),
    error ? null : service.listRemittances(filters),
  ]);

  const canExport = remittances?.ok && remittances.data.total > 0;

  return (
    <>
      <PageHeader
        title="COD Remittance"
        description="Track your Cash on Delivery settlements"
        actions={
          canExport ? (
          <a
            href={codHref(filters, { path: COD_EXPORT_PATH })}
            download
            className={`${EXPORT_BUTTON} bg-primary hover:bg-accent`}
          >
            <Download aria-hidden="true" className="size-4" />
            Export CSV
          </a>
        ) : (
          <span aria-disabled="true" className={`${EXPORT_BUTTON} bg-primary/50`}>
            <Download aria-hidden="true" className="size-4" />
            Export CSV
          </span>
          )
        }
      />

      {summary.ok ? (
        <section data-testid="cod-summary" aria-labelledby="cod-summary-title" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="cod-summary-title"
              className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl"
            >
              Summary
            </h2>
            {summary.source === 'mock' ? <SampleBadge /> : null}
          </div>
          <div className="motion-stagger grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:gap-4 xl:grid-cols-4">
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
        <DataCard testId="cod-summary" title="Summary" result={summary}>
          {() => null}
        </DataCard>
      )}

      {/* The key resets the form's own state when Clear or the back button changes the URL. */}
      <RemittanceFilters key={codHref(filters)} filters={filters} error={error} />

      {remittances ? (
        <DataCard testId="cod-remittances" title="Remittances" result={remittances}>
          {(page) => <RemittanceTable result={page} filters={filters} />}
        </DataCard>
      ) : null}
    </>
  );
}
