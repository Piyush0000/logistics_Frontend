import { Hourglass, Scale, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { StatTile } from '@/components/ui/stat-tile';
import { getDemoSession } from '@/lib/auth/session';
import { DISCREPANCY_STATUSES, weightService } from '@/lib/data/weight';
import { walletService } from '@/lib/data/wallet';
import { formatPaise } from '@/lib/format/money';
import { buildPageHref, parseEnum, parsePage, parseText } from '@/lib/url-params';
import { DiscrepancyList } from './discrepancy-table';
import { WeightFilter } from './weight-filter';

export const metadata: Metadata = { title: 'Weight discrepancies | Evoc Ships' };

const PATH = '/reconciliation/weight';

interface WeightPageProps {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}

export default async function WeightPage({ searchParams }: WeightPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = parsePage(params.page);
  // A status that is not one of the four is ignored, so every status shows.
  const status = parseEnum(params.status, DISCREPANCY_STATUSES);
  const q = parseText(params.q);
  const service = weightService();

  const [wallet, summary, discrepancies] = await Promise.all([
    walletService().getBalance(),
    service.getSummary(),
    service.listDiscrepancies({ status, q, page }),
  ]);
  const buildHref = (next: number) => buildPageHref(PATH, { status, q }, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Weight discrepancies"
          description="Couriers sometimes charge for more weight than you declared. Accept the charge, or dispute it with photos before the response window closes."
        />

        <DataCard testId="weight-summary" title="Summary" result={summary}>
          {(data) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Open" value={data.open.toLocaleString('en-IN')} icon={Scale} />
              <StatTile label="Disputed" value={data.disputed.toLocaleString('en-IN')} icon={Hourglass} />
              <StatTile label="Extra charges pending" value={formatPaise(data.extraChargePaise)} icon={Wallet} />
            </div>
          )}
        </DataCard>

        <WeightFilter key={`${status ?? 'all'}|${q}`} status={status} q={q} path={PATH} />

        <DataCard testId="weight-card" title="Discrepancies" result={discrepancies}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No weight discrepancies match these filters. Clear the filters to see them all." />
            ) : (
              <div className="grid gap-4">
                <DiscrepancyList items={data.items} now={new Date().toISOString()} />
                <Pagination page={data.page} pageCount={data.pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </AppShell>
  );
}
