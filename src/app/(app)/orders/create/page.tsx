import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { SampleBadge } from '@/components/sample-badge';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { CreateShipmentForm } from './create-form';

export const metadata: Metadata = { title: 'Create Shipment | Evoc Logistics' };

export default async function CreateShipmentPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="mx-auto max-w-5xl grid gap-6">
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

        {/* Title */}
        <div>
          <h1 className="font-heading text-2xl font-bold lg:text-3xl">Create New Shipment</h1>
          <p className="mt-1 text-sm text-on-surface/70">
            Book single shipment order with address validation and carrier allocation.
          </p>
        </div>

        {/* Booking Form */}
        <CreateShipmentForm />
      </div>
    </AppShell>
  );
}

