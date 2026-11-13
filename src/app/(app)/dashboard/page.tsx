import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { parseRange } from '@/lib/data/analytics/totals';
import { formatDateRange } from '@/lib/format/date';
import { AlertTicker, OverviewTabs, PageHeading, parseTab } from './sections';
import { DeliveredTab } from './tabs/delivered-tab';
import { NdrTab } from './tabs/ndr-tab';
import { OverviewTab } from './tabs/overview-tab';
import { PickupsTab } from './tabs/pickups-tab';
import { RevenueTab } from './tabs/revenue-tab';
import { SmsTab } from './tabs/sms-tab';
import { RtoTab } from './tabs/rto-tab';

export const metadata: Metadata = { title: 'Dashboard | Evoc Ships' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; range?: string | string[] }>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const tab = parseTab(params.tab);
  const range = parseRange(params.range);

  return (
    <>
      <AlertTicker />
      <PageHeading dateRange={formatDateRange(new Date())} />
      <OverviewTabs active={tab} />
      {tab === 'pickups' ? (
        <PickupsTab />
      ) : tab === 'ndr' ? (
        <NdrTab />
      ) : tab === 'rto' ? (
        <RtoTab />
      ) : tab === 'delivered' ? (
        <DeliveredTab range={range} />
      ) : tab === 'sms' ? (
        <SmsTab range={range} />
      ) : tab === 'revenue' ? (
        <RevenueTab range={range} />
      ) : (
        <OverviewTab />
      )}
    </>
  );
}
