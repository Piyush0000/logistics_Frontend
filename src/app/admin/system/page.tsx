import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { adminSystemService, type HealthStatus } from '@/lib/admin/data/system';
import { auditHref, parseAuditFilters } from '@/lib/admin/data/system/audit-filters';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';
import { AuditFiltersForm } from './audit-filters-form';

export const metadata: Metadata = { title: 'System' };

const HEALTH: Record<HealthStatus, [string, ChipTone]> = {
  up: ['Up', 'success'],
  degraded: ['Slow', 'warning'],
  down: ['Down', 'error'],
};

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminSystemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { filters, notice } = parseAuditFilters(await searchParams);
  const service = adminSystemService();
  const [health, audit] = await Promise.all([service.getHealth(), service.listAuditLog(filters)]);

  return (
    <>
      <PageHeader title="System" description="Backend health and a record of admin changes." />

      <DataCard testId="admin-health" title="Service health" result={health}>
        {(services) => (
          <ul className="motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((entry) => {
              const [label, tone] = HEALTH[entry.status];
              return (
                <li key={entry.service} data-testid="admin-service" className="rounded-control border border-secondary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{entry.service}</span>
                    <StatusChip tone={tone}>{label}</StatusChip>
                  </div>
                  <p className="mt-2 text-xs text-on-surface/65">
                    {entry.latencyMs === null ? 'No answer' : `${entry.latencyMs} ms`} · checked {formatDateTime(entry.checkedAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </DataCard>

      <DataCard testId="admin-audit" title="Audit log" result={audit}>
        {({ page, actions, applied }) => (
          <>
            {/* The key resets the form when Clear or the back button changes the URL. */}
            <AuditFiltersForm key={auditHref(applied)} filters={applied} actions={actions} />
            {notice ? (
              <p
                data-testid="audit-notice"
                className="mb-4 rounded-control border border-warning/30 bg-warning/10 p-3 text-sm"
              >
                {notice}
              </p>
            ) : null}

            {page.items.length === 0 ? (
              <EmptyState
                message={
                  applied.action || applied.from || applied.to
                    ? 'No admin changes match these filters.'
                    : 'No admin changes recorded yet.'
                }
              />
            ) : (
              <>
                <p className="text-xs text-on-surface/60">
                  {page.total} {page.total === 1 ? 'change' : 'changes'}
                </p>
                <ol className="grid divide-y divide-secondary/70">
                  {page.items.map((entry) => (
                    <li
                      key={entry.id}
                      data-testid="admin-audit-entry"
                      className="grid gap-0.5 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
                    >
                      <span className="text-xs text-on-surface/60">{formatDateTime(entry.at)}</span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        <span className="block text-sm font-semibold">
                          {entry.action} <span className="font-normal text-on-surface/70">· {entry.target}</span>
                        </span>
                        <span className="block text-xs text-on-surface/65">{entry.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Pagination
                  page={page.page}
                  pageCount={Math.ceil(page.total / page.pageSize)}
                  buildHref={(next) => auditHref(applied, next)}
                />
              </>
            )}
          </>
        )}
      </DataCard>

      <PlannedWork
        items={[
          'Live health: call each service /health through a server route with a short timeout (needs a gateway route; see docs/admin/backend-needs.md).',
          'Webhook delivery failures across merchants with a retry button (webhooks service support routes exist).',
          'Call recordAudit() from each admin action as it ships: wallet adjustment, COD actions, courier on and off, rate changes (Teammate 1: merchant status, KYC, tickets).',
        ]}
      />
    </>
  );
}
