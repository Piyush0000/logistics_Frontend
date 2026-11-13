import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { trackingPageService } from '@/lib/data/tracking-page';
import { SettingsNav } from '../settings-nav';
import { BrandingForm } from './branding-form';

export const metadata: Metadata = { title: 'Tracking Page | Evoc Ships' };

export default async function TrackingPageSettings() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [branding] = await Promise.all([
    trackingPageService().get(),
  ]);

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Tracking Page"
          description="Set up the page your buyers open to follow a parcel."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/tracking-page" />

          <DataCard testId="tracking-page-card" title="Branding and preview" result={branding}>
            {(data) => <BrandingForm branding={data} />}
          </DataCard>
        </div>
      </div>
    </>
  );
}
