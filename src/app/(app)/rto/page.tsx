import { IndianRupee, PackageCheck, Undo2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { StatTile } from '@/components/ui/stat-tile';
import { getDemoSession } from '@/lib/auth/session';
import { RTO_PAGE_SIZE, RTO_STAGES, rtoService, type RtoStage } from '@/lib/data/rto';
import { walletService } from '@/lib/data/wallet';
import { formatPaise } from '@/lib/format/money';
import { buildPageHref, parseEnum, parsePage } from '@/lib/url-params';
import { RtoCards } from './rto-cards';
import { RtoTable } from './rto-table';

export const metadata: Metadata = { title: 'RTO | Evoc Ships' };

const TABS: { stage: RtoStage; label: string }[] = [
  { stage: 'in_progress', label: 'In progress' },
  { stage: 'delivered', label: 'Delivered' },
];

interface RtoPageProps {
  searchParams: Promise<{ stage?: string; page?: string }>;
}

export default async function RtoPage({ searchParams }: RtoPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const stage = parseEnum(params.stage, RTO_STAGES) ?? 'in_progress';
  const page = parsePage(params.page);

  const service = rtoService();
  const [wallet, summary, list] = await Promise.all([
    walletService().getBalance(),
    service.getSummary(),
    service.listRto({ stage, page }),
  ]);

  // The first stage is the default, so its link carries no stage parameter.
  const stageParam = stage === 'in_progress' ? undefined : stage;
  const pageCount = list.ok ? Math.max(1, Math.ceil(list.data.total / RTO_PAGE_SIZE)) : 1;
  const buildHref = (next: number) => buildPageHref('/rto', { stage: stageParam }, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader title="RTO" description="Shipments returning to you, and the ones that are back." />

        <DataCard testId="rto-summary" title="RTO summary" result={summary}>
          {(data) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                testId="tile-rto-in-progress"
                label="RTO in progress"
                value={data.inProgress}
                icon={Undo2}
              />
              <StatTile
                testId="tile-rto-delivered"
                label="RTO delivered"
                value={data.delivered}
                icon={PackageCheck}
              />
              <StatTile
                testId="tile-rto-charges"
                label="RTO charges"
                value={
                  data.rtoChargesPaise === null
                    ? 'Not available yet'
                    : formatPaise(data.rtoChargesPaise)
                }
                icon={IndianRupee}
              />
            </div>
          )}
        </DataCard>

        <div
          role="tablist"
          aria-label="RTO stage"
          className="flex w-full gap-1 rounded-full bg-muted p-1 sm:w-fit"
        >
          {TABS.map((tab) => {
            const selected = tab.stage === stage;
            return (
              <Link
                key={tab.stage}
                role="tab"
                aria-selected={selected}
                href={buildPageHref('/rto', { stage: tab.stage === 'in_progress' ? undefined : tab.stage }, 1)}
                className={`inline-flex h-11 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors sm:flex-none lg:h-10 ${
                  selected
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface/70 hover:text-on-surface'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <DataCard testId="rto-card" title="Shipments" result={list}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No shipments are returning." />
            ) : (
              <div className="grid gap-4">
                <RtoTable orders={data.items} />
                <RtoCards orders={data.items} />
                <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </AppShell>
  );
}
