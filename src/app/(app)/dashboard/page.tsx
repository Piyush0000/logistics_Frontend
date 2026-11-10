import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { formatDateRange } from '@/lib/format/date';
import { AlertTicker, OverviewTabs, PageHeading, parseTab } from './sections';
import { NdrTab } from './tabs/ndr-tab';
import { OverviewTab } from './tabs/overview-tab';
import { PickupsTab } from './tabs/pickups-tab';
import { RtoTab } from './tabs/rto-tab';

export const metadata: Metadata = { title: 'Dashboard | Evoc Logistics' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const tab = parseTab((await searchParams).tab);
  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <AlertTicker />
      <PageHeading dateRange={formatDateRange(new Date())} />
      <OverviewTabs active={tab} />
      {tab === 'pickups' ? (
        <PickupsTab />
      ) : tab === 'ndr' ? (
        <NdrTab />
      ) : tab === 'rto' ? (
        <RtoTab />
      ) : (
        <OverviewTab />
      )}
    </AppShell>
  );
}
