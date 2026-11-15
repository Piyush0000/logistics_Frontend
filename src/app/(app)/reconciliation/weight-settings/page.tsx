import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { weightSettingsService } from '@/lib/data/weight-settings';
import { PackagePresets } from './package-presets';

export const metadata: Metadata = { title: 'Weight settings | Evoc Ships' };

export default async function WeightSettingsPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [presets] = await Promise.all([
    weightSettingsService().listPresets(),
  ]);

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Weight settings"
          description="Save the parcel sizes you ship most, and see what a courier would charge for each. One preset is your default. The default preset can't be deleted while you have others, so make another preset the default first."
        />

        <DataCard testId="presets-card" title="Package presets" result={presets}>
          {(data) => <PackagePresets presets={data} />}
        </DataCard>
      </div>
    </>
  );
}
