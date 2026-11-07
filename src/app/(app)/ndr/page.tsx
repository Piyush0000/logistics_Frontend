import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SampleBadge } from '@/components/sample-badge';
import { getDemoSession } from '@/lib/auth/session';
import { ndrService } from '@/lib/data/ndr';
import { walletService } from '@/lib/data/wallet';
import { NdrView } from './ndr-view';

export const metadata: Metadata = { title: 'NDR Management | Evoc Logistics' };

export default async function NdrPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [wallet, ndrResult] = await Promise.all([
    walletService().getBalance(),
    ndrService().getNdrDashboard(),
  ]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Orders</span>
          </Link>
          <SampleBadge />
        </div>

        {/* Page Title */}
        <div>
          <h1 className="font-heading text-2xl font-bold lg:text-3xl">
            Non-Delivery Reports (NDR)
          </h1>
          <p className="mt-1 text-sm text-on-surface/70">
            Take proactive merchant action on failed delivery attempts to reduce RTO rates.
          </p>
        </div>

        {/* Content */}
        {!ndrResult.ok ? (
          <div
            data-testid="ndr-error"
            className="rounded-card border border-error/30 bg-error/10 p-6 text-center text-error"
          >
            <p className="font-semibold">Failed to load NDR reports</p>
            <p className="mt-1 text-xs text-on-surface/80">{ndrResult.error.message}</p>
          </div>
        ) : (
          <NdrView data={ndrResult.data} />
        )}
      </div>
    </AppShell>
  );
}

