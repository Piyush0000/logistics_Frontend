import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { CalculatorForm } from './calculator-form';

export const metadata: Metadata = { title: 'Rate calculator | Evoc Logistics' };

export default async function RateCalculatorPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Rate calculator"
          description="Enter the pincodes, weight and size of a parcel to compare what each courier would charge. Couriers bill the larger of the real weight and the volumetric weight."
        />
        <CalculatorForm />
      </div>
    </AppShell>
  );
}
