import { CircleCheck, PackageX, Truck, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Gauge } from '@/components/charts/gauge';
import { SegmentBar } from '@/components/charts/segment-bar';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';
import {
  loadChecklist,
  loadNdrDashboard,
  loadShipmentSummary,
  loadWallet,
} from '@/lib/data/request-cache';
import { formatPaise } from '@/lib/format/money';
import { userLabel } from '@/lib/format/user';
import { getInsights, needsYouToday } from '@/lib/insights';
import { InsightsPanel, InsightsSkeleton, NeedsYouToday } from './insights-panel';
import { OnboardingChecklist } from './onboarding-checklist';
import { QuickActions } from './quick-actions';
import { RecentShipments } from './recent-shipments';
import { StatCard } from './stat-card';

export const metadata: Metadata = { title: 'Home | Evoc Ships' };

async function Kpis() {
  const [wallet, summary, ndr] = await Promise.all([loadWallet(), loadShipmentSummary(), loadNdrDashboard()]);
  return (
    <div className="motion-stagger grid grid-cols-2 gap-3 lg:gap-4 2xl:grid-cols-4">
      <StatCard
        testId="stat-wallet"
        label="Wallet Balance"
        icon={Wallet}
        tone="primary"
        result={wallet}
        value={(balance) => formatPaise(balance.availablePaise)}
      />
      <StatCard
        testId="stat-in-transit"
        label="In Transit"
        icon={Truck}
        tone="accent"
        result={summary}
        value={(data) => data.inTransit}
      />
      <StatCard
        testId="stat-ndr"
        label="NDR Action Required"
        icon={PackageX}
        tone="warning"
        result={ndr}
        value={(data) => data.kpis.openNdr}
      />
      <StatCard
        testId="stat-delivered"
        label="Delivered"
        icon={CircleCheck}
        tone="success"
        result={summary}
        value={(data) => data.delivered}
      />
    </div>
  );
}

async function Insights() {
  const insights = await getInsights();
  return (
    <>
      <NeedsYouToday items={needsYouToday(insights)} />
      <InsightsPanel insights={insights.filter((i) => i.tone === 'info' || i.tone === 'good')} />
    </>
  );
}

async function Health() {
  const summary = await loadShipmentSummary();
  return (
    <div className="grid gap-4 lg:gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <DataCard testId="delivery-success-card" title="Delivery success" result={summary}>
        {(data) => {
          const closed = data.delivered + data.rto;
          return (
            <div className="grid justify-items-center gap-1">
              <Gauge value={closed > 0 ? (data.delivered / closed) * 100 : 0} label="Delivered of all closed shipments" tone="success" />
            </div>
          );
        }}
      </DataCard>
      <DataCard testId="pipeline-card" title="Where your shipments are" result={summary}>
        {(data) => (
          <div className="grid gap-4">
            <p className="font-mono text-3xl font-medium tracking-tight">
              {(data.toBeProcessed + data.readyToShip + data.inTransit + data.outForDelivery).toLocaleString('en-IN')}
              <span className="ml-2 font-body text-sm font-normal text-on-surface/60">on the way</span>
            </p>
            <SegmentBar
              title="Shipments by stage"
              segments={[
                { label: 'To process', value: data.toBeProcessed + data.readyToShip, tone: 'series3' },
                { label: 'In transit', value: data.inTransit, tone: 'primary' },
                { label: 'Out for delivery', value: data.outForDelivery, tone: 'series2' },
                { label: 'Returning', value: data.rto, tone: 'error' },
              ]}
            />
          </div>
        )}
      </DataCard>
    </div>
  );
}

async function Recent() {
  const [checklist, recent] = await Promise.all([loadChecklist(), ordersService().listOrders({ page: 1, limit: 5 })]);
  return (
    <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <DataCard testId="checklist-card" title="Get started" result={checklist}>
        {(items) => <OnboardingChecklist items={items} />}
      </DataCard>
      <DataCard testId="recent-shipments-card" title="Recent shipments" result={recent}>
        {(data) => <RecentShipments orders={data.items} />}
      </DataCard>
    </div>
  );
}

const block = (height: string) => <Skeleton className={`${height} rounded-card`} />;

export default async function HomePage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  return (
    <>
      <PageHeader title="Home" />
      <div className="-mt-2">
        <p className="font-heading text-2xl leading-8 font-bold tracking-tight break-words">
          Welcome, {userLabel(session.email).name}
        </p>
        <p className="mt-1 text-sm text-on-surface/70">Here is where your shipping stands today.</p>
      </div>

      <QuickActions />

      {/* One grid: on phones the insights follow the figures; on wide screens they take the right column. */}
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:grid-rows-[auto_auto_1fr] xl:items-start">
        <div className="min-w-0 xl:col-start-1">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-3 lg:gap-4 2xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-card" />
                ))}
              </div>
            }
          >
            <Kpis />
          </Suspense>
        </div>
        <aside aria-label="Today" className="grid min-w-0 gap-4 lg:gap-5 xl:sticky xl:top-24 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <Suspense fallback={<InsightsSkeleton />}>
            <Insights />
          </Suspense>
        </aside>
        <div className="min-w-0 xl:col-start-1">
          <Suspense fallback={block('h-56')}>
            <Health />
          </Suspense>
        </div>
        <div className="min-w-0 xl:col-start-1">
          <Suspense fallback={block('h-80')}>
            <Recent />
          </Suspense>
        </div>
      </div>
    </>
  );
}
