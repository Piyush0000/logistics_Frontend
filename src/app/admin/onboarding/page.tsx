import type { Metadata } from 'next';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { adminOnboardingService, APPLICATION_STATUSES } from '@/lib/admin/data/onboarding';
import { requireAdminSession } from '@/lib/admin/session';
import { parseEnum, parseText } from '@/lib/url-params';
import { OnboardingView } from './onboarding-view';

export const metadata: Metadata = { title: 'Onboarding & KYC' };

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const statusParam = parseEnum(params.status, [...APPLICATION_STATUSES, 'all']);

  // Fetch all applications so tabs and dynamic filters work instantly
  const result = await adminOnboardingService().listApplications();

  return (
    <div className="grid gap-4 lg:gap-5 min-w-0 max-w-full overflow-hidden" data-testid="admin-onboarding-page">
      <PageHeader
        title="Onboarding & KYC"
        description="New merchants waiting for approval, and past decisions."
      />

      <DataCard testId="admin-applications" title="Applications" result={result}>
        {(applications) => (
          <OnboardingView
            allApplications={applications}
            initialStatus={statusParam || 'pending'}
            initialQuery={parseText(params.q, 100)}
          />
        )}
      </DataCard>
    </div>
  );
}
