import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { companyService } from '@/lib/data/company';
import { SettingsNav } from '../settings-nav';
import { CompanyForm } from './company-form';

export const metadata: Metadata = { title: 'Company & KYC | Evoc Ships' };

export default async function CompanyPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [company] = await Promise.all([
    companyService().getCompany(),
  ]);

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Company & KYC"
          description="Your business details and the documents we need to verify them."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/company" />

          <DataCard testId="company-card" title="Business and bank details" result={company}>
            {(data) => <CompanyForm company={data} />}
          </DataCard>
        </div>
      </div>
    </>
  );
}
