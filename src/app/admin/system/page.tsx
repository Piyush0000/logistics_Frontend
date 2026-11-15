import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { adminSystemService, type HealthStatus } from '@/lib/admin/data/system';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';

export const metadata: Metadata = { title: 'System' };

const HEALTH: Record<HealthStatus, [string, ChipTone]> = {
  up: ['Up', 'success'],
  degraded: ['Slow', 'warning'],
  down: ['Down', 'error'],
};

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminSystemPage() {
  await requireAdminSession();
  const service = adminSystemService();
  const [health, audit] = await Promise.all([service.getHealth(), service.listAuditLog()]);

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
        {(entries) =>
          entries.length === 0 ? (
            <EmptyState message="No admin changes recorded yet." />
          ) : (
            <ol className="grid divide-y divide-secondary/70">
              {entries.map((entry) => (
                <li key={entry.id} data-testid="admin-audit-entry" className="grid gap-0.5 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                  <span className="text-xs text-on-surface/60">{formatDateTime(entry.at)}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {entry.action} <span className="font-normal text-on-surface/70">· {entry.target}</span>
                    </span>
                    <span className="block text-xs text-on-surface/65">{entry.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          )
        }
      </DataCard>

      <PlannedWork
        items={[
          'Live health: call each service /health through a server route with a short timeout (needs a gateway route; see docs/admin/backend-needs.md).',
          'Webhook delivery failures across merchants with a retry button (webhooks service support routes exist).',
          'Write an audit entry from every admin action (merchant status, KYC decision, wallet adjustment, rate change); add a small recordAudit() helper both teammates call.',
          'Filter the audit log by action and date.',
        ]}
      />
    </>
  );
}
