import { ArrowLeft, CheckCircle2, ExternalLink, FileCheck, FileText, MapPin, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminLoadError } from '@/components/admin/load-error';
import { notFound } from 'next/navigation';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import {
  adminOnboardingService,
  type ApplicationStatus,
  type DocumentKind,
} from '@/lib/admin/data/onboarding';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';
import { ApplicationDecisionButtons } from './decision-dialog';

const STATUS_TONE: Record<ApplicationStatus, ChipTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const DOC_KIND_LABEL: Record<DocumentKind, string> = {
  gst_certificate: 'GST Certificate',
  pan_card: 'PAN Card',
  cancelled_cheque: 'Cancelled Cheque',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Application ${id} | Onboarding & KYC` };
}

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminOnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const appResult = await adminOnboardingService().getApplication(id);
  if (!appResult.ok) {
    if (appResult.error.kind === 'not_found') {
      notFound();
    }
    // Backend unavailable or another error: show it on the page instead of crashing to the global error page.
    return <AdminLoadError title={`Application ${id}`} testId="admin-application-error" result={appResult} />;
  }

  const application = appResult.data;

  return (
    <div className="grid gap-4 lg:gap-5" data-testid="admin-onboarding-detail">
      {/* Back link */}
      <div>
        <Link
          href="/admin/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          <span>Back to applications</span>
        </Link>
      </div>

      {/* Header section */}
      <section className="motion-rise rounded-card border border-secondary bg-surface p-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface/50">
                KYC Application
              </span>
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-[11px] text-on-surface/70">
                {application.id}
              </span>
            </div>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {application.businessName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-on-surface/60">Submitted {formatDateTime(application.submittedAt)}</span>
              <span className="text-on-surface/30">·</span>
              <StatusChip tone={STATUS_TONE[application.status]}>{application.status}</StatusChip>
            </div>
          </div>

          {/* Action buttons */}
          <ApplicationDecisionButtons
            applicationId={application.id}
            businessName={application.businessName}
            currentStatus={application.status}
          />
        </div>
      </section>

      {/* Decision status alert banner if already decided */}
      {application.status === 'approved' ? (
        <div
          role="status"
          data-testid="admin-application-approved-banner"
          className="flex items-center gap-3 rounded-control border border-success/30 bg-success/10 p-4 text-sm text-success"
        >
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Application approved:</span> This merchant has been verified and their account is active.
          </div>
          <Link
            href={`/admin/merchants/${application.merchantId}`}
            className="inline-flex items-center gap-1 rounded-control bg-success/20 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/30"
          >
            <span>View merchant</span>
            <ExternalLink aria-hidden="true" className="size-3" />
          </Link>
        </div>
      ) : null}

      {application.status === 'rejected' ? (
        <div
          role="status"
          data-testid="admin-application-rejected-banner"
          className="flex flex-col gap-1 rounded-control border border-error/30 bg-error/10 p-4 text-sm text-error"
        >
          <div className="flex items-center gap-2 font-semibold">
            <XCircle aria-hidden="true" className="size-5 shrink-0" />
            <span>Application rejected</span>
          </div>
          {application.rejectionReason ? (
            <p className="mt-1 text-xs text-error/90">
              <span className="font-semibold">Reason provided to merchant:</span> {application.rejectionReason}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Main Details Grid */}
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start">
        {/* Business details */}
        <DataCard
          testId="admin-onboarding-business"
          title="Business details"
          result={appResult}
          actions={
            <Link
              href={`/admin/merchants/${application.merchantId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Merchant profile</span>
              <ExternalLink aria-hidden="true" className="size-3" />
            </Link>
          }
        >
          {() => (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                <span className="text-xs text-on-surface/60">Business Name</span>
                <div className="mt-0.5 font-semibold text-on-surface">{application.businessName}</div>
              </div>

              <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                <span className="text-xs text-on-surface/60">Contact Email</span>
                <div className="mt-0.5 truncate font-mono text-xs text-on-surface">{application.email}</div>
              </div>

              <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                <span className="text-xs text-on-surface/60">City</span>
                <div className="mt-0.5 flex items-center gap-1 font-semibold text-on-surface">
                  <MapPin aria-hidden="true" className="size-3.5 text-on-surface/50" />
                  <span>{application.city}</span>
                </div>
              </div>

              <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                <span className="text-xs text-on-surface/60">Merchant ID</span>
                <div className="mt-0.5 font-mono text-xs font-semibold text-on-surface">{application.merchantId}</div>
              </div>

              <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                <span className="text-xs text-on-surface/60">GSTIN</span>
                <div className="mt-0.5 font-mono text-xs font-semibold text-on-surface">
                  {application.gstin || 'Not provided'}
                </div>
              </div>

              <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                <span className="text-xs text-on-surface/60">PAN</span>
                <div className="mt-0.5 font-mono text-xs font-semibold text-on-surface">
                  {application.pan || 'Not provided'}
                </div>
              </div>
            </div>
          )}
        </DataCard>

        {/* Submitted documents */}
        <DataCard
          testId="admin-onboarding-documents"
          title={`Submitted documents (${application.documents.length} of 3)`}
          result={appResult}
        >
          {() => (
            <div className="grid gap-3">
              {application.documents.map((doc) => (
                <div
                  key={doc.kind}
                  data-testid="admin-onboarding-doc-row"
                  className="flex items-center justify-between gap-3 rounded-control border border-secondary/70 bg-surface p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
                      <FileText aria-hidden="true" className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-heading text-sm font-semibold text-on-surface">
                        {DOC_KIND_LABEL[doc.kind] || doc.kind}
                      </div>
                      <div className="truncate font-mono text-xs text-on-surface/60">
                        {doc.fileName}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-on-surface/50">
                      {formatFileSize(doc.size)}
                    </span>
                    <FileCheck aria-hidden="true" className="size-4 text-success" />
                  </div>
                </div>
              ))}

              <p className="mt-1 text-xs text-on-surface/50">
                Show only file names and sizes; file contents are kept securely in private cloud storage.
              </p>
            </div>
          )}
        </DataCard>
      </div>
    </div>
  );
}

