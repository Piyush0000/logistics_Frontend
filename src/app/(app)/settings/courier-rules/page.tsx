import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { courierRulesService } from '@/lib/data/courier-rules';
import { walletService } from '@/lib/data/wallet';
import { SettingsNav } from '../settings-nav';
import { RulesPanel } from './rules-panel';

export const metadata: Metadata = { title: 'Courier Rules | Evoc Ships' };

export default async function CourierRulesPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [wallet, rules] = await Promise.all([walletService().getBalance(), courierRulesService().get()]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Courier Rules"
          description="Choose how a courier is picked for each shipment, and which couriers can be used."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/courier-rules" />

          <DataCard testId="rules-card" title="Courier rules" result={rules}>
            {(data) => <RulesPanel initial={data} />}
          </DataCard>
        </div>
      </div>
    </AppShell>
  );
}
