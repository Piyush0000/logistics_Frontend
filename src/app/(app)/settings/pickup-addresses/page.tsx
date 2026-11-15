import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { pickupAddressService } from '@/lib/data/pickup-addresses';
import { SettingsNav } from '../settings-nav';
import { AddressList } from './address-list';

export const metadata: Metadata = { title: 'Pickup Addresses | Evoc Ships' };

export default async function PickupAddressesPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [addresses] = await Promise.all([
    pickupAddressService().list(),
  ]);

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Pickup Addresses"
          description="The places couriers collect your parcels from."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/pickup-addresses" />

          <DataCard testId="addresses-card" title="Saved addresses" result={addresses}>
            {(data) => <AddressList addresses={data} />}
          </DataCard>
        </div>
      </div>
    </>
  );
}
