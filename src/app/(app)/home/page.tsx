import { CircleCheck, PackageX, Truck, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { ndrService } from '@/lib/data/ndr';
import { notAvailable } from '@/lib/data/not-available';
import { onboardingService } from '@/lib/data/onboarding';
import { ordersService } from '@/lib/data/orders';
import { shipmentService } from '@/lib/data/shipments';
import { resolveDataSource } from '@/lib/data/source';
import { walletService } from '@/lib/data/wallet';
import { formatPaise } from '@/lib/format/money';
import { userLabel } from '@/lib/format/user';
import { OnboardingChecklist } from './onboarding-checklist';
import { QuickActions } from './quick-actions';
import { RecentShipments } from './recent-shipments';
import { StatCard } from './stat-card';

export const metadata: Metadata = { title: 'Home | Evoc Logistics' };

export default async function HomePage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [wallet, summary, ndr, checklist, recent] = await Promise.all([
    walletService().getBalance(),
    shipmentService().getSummary(),
    // The backend has no NDR route, so in gateway mode this must not pass sample data as real.
    resolveDataSource('ndr') === 'gateway' ? notAvailable() : ndrService().getNdrDashboard(),
    onboardingService().getChecklist(),
    ordersService().listOrders({ page: 1, limit: 5 }),
  ]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <PageHeader title="Home" />
      <div>
        <p className="font-heading text-2xl leading-8 break-words">
          Welcome, {userLabel(session.email).name}
        </p>
        <p className="mt-1 text-sm text-on-surface/70">Here is where your shipping stands today.</p>
      </div>

      <QuickActions />

      <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
        <StatCard
          testId="stat-wallet"
          label="Wallet Balance"
          icon={Wallet}
          result={wallet}
          value={(balance) => formatPaise(balance.availablePaise)}
        />
        <StatCard
          testId="stat-in-transit"
          label="In Transit"
          icon={Truck}
          result={summary}
          value={(data) => data.inTransit}
        />
        <StatCard
          testId="stat-ndr"
          label="NDR Action Required"
          icon={PackageX}
          result={ndr}
          value={(data) => data.kpis.openNdr}
        />
        <StatCard
          testId="stat-delivered"
          label="Delivered"
          icon={CircleCheck}
          result={summary}
          value={(data) => data.delivered}
        />
      </div>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DataCard testId="checklist-card" title="Get started" result={checklist}>
          {(items) => <OnboardingChecklist items={items} />}
        </DataCard>
        <DataCard testId="recent-shipments-card" title="Recent shipments" result={recent}>
          {(data) => <RecentShipments orders={data.items} />}
        </DataCard>
      </div>
    </AppShell>
  );
}
