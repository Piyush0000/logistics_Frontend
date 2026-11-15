import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminOnboardingService, type ApplicationStatus } from '@/lib/admin/data/onboarding';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';

export const metadata: Metadata = { title: 'Onboarding & KYC' };

const TONE: Record<ApplicationStatus, ChipTone> = { pending: 'warning', approved: 'success', rejected: 'error' };

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminOnboardingPage() {
  await requireAdminSession();
  const result = await adminOnboardingService().listApplications();

  return (
    <>
      <PageHeader title="Onboarding & KYC" description="New merchants waiting for approval, and past decisions." />

      <DataCard testId="admin-applications" title="Applications" result={result}>
        {(applications) =>
          applications.length === 0 ? (
            <EmptyState message="No applications yet." />
          ) : (
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>Business</th>
                    <th className={t.th}>City</th>
                    <th className={t.th}>Submitted</th>
                    <th className={`${t.th} text-right`}>Documents</th>
                    <th className={t.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id} data-testid="admin-application-row" className={t.rowHover}>
                      <td className={t.td}>
                        <div className="font-semibold">{application.businessName}</div>
                        <div className="text-xs text-on-surface/60">{application.email}</div>
                      </td>
                      <td className={t.td}>{application.city}</td>
                      <td className={`${t.td} text-xs text-on-surface/70`}>{formatDateTime(application.submittedAt)}</td>
                      <td className={t.tdNumeric}>{application.documents.length} of 3</td>
                      <td className={t.td}>
                        <StatusChip tone={TONE[application.status]}>{application.status}</StatusChip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </DataCard>

      <PlannedWork
        items={[
          'Status tabs: Pending (default), Approved, Rejected (service: listApplications(status)).',
          'Review page at /admin/onboarding/[id] (service: getApplication): business details, GSTIN and PAN, each document with name and size.',
          'Approve and Reject actions; rejecting needs a reason the merchant will see (add decide() to the service).',
          'Pending count badge on the Overview "KYC waiting" figure links here (already linked from Needs you).',
          'Phone layout: one card per application below 1024px.',
        ]}
      />
    </>
  );
}
