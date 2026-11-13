import { randomUUID } from 'node:crypto';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SampleBadge } from '@/components/sample-badge';
import { getDemoSession } from '@/lib/auth/session';
import { pickupAddressService } from '@/lib/data/pickup-addresses';
import { resolveDataSource } from '@/lib/data/source';
import { CreateShipmentForm } from './create-form';

export const metadata: Metadata = { title: 'Create Shipment | Evoc Ships' };

export default async function CreateShipmentPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [addresses] = await Promise.all([
    pickupAddressService().list(),
  ]);

  // A fresh key per render; "Book another" refreshes the page, which remounts the form with a new key.
  const idempotencyKey = `idem-${randomUUID()}`;

  return (
    <>
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
          {resolveDataSource('orders') === 'mock' ? <SampleBadge /> : null}
        </div>

        {/* Title */}
        <div>
          <h1 className="font-heading text-2xl font-bold lg:text-3xl">Create New Shipment</h1>
          <p className="mt-1 text-sm text-on-surface/70">
            Book single shipment order with address validation and carrier allocation.
          </p>
        </div>

        {/* Booking Form */}
        <CreateShipmentForm
          key={idempotencyKey}
          idempotencyKey={idempotencyKey}
          savedAddresses={addresses.ok ? addresses.data : []}
        />
      </div>
    </>
  );
}

