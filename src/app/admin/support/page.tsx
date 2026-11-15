import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminSupportService, type AdminTicket, type AdminTicketStatus } from '@/lib/admin/data/support';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';

export const metadata: Metadata = { title: 'Support' };

const STATUS: Record<AdminTicketStatus, [string, ChipTone]> = {
  open: ['Open', 'warning'],
  awaiting_merchant: ['Awaiting merchant', 'info'],
  resolved: ['Resolved', 'success'],
};
const PRIORITY: Record<AdminTicket['priority'], ChipTone> = { high: 'error', normal: 'neutral', low: 'neutral' };

// Owner: Teammate 1. See docs/admin/team-split.md.
export default async function AdminSupportPage() {
  await requireAdminSession();
  const result = await adminSupportService().listTickets();

  return (
    <>
      <PageHeader title="Support" description="Tickets from every merchant." />

      <DataCard testId="admin-tickets" title="Tickets" result={result}>
        {(tickets) =>
          tickets.length === 0 ? (
            <EmptyState message="No tickets." />
          ) : (
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>Ticket</th>
                    <th className={t.th}>Merchant</th>
                    <th className={t.th}>Category</th>
                    <th className={t.th}>Priority</th>
                    <th className={t.th}>Status</th>
                    <th className={t.th}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const [label, tone] = STATUS[ticket.status];
                    return (
                      <tr key={ticket.id} data-testid="admin-ticket-row" className={t.rowHover}>
                        <td className={t.td}>
                          <div className="font-semibold">{ticket.subject}</div>
                          <div className="font-mono text-xs text-on-surface/60">{ticket.id}</div>
                        </td>
                        <td className={t.td}>{ticket.merchantName}</td>
                        <td className={t.td}>{ticket.category}</td>
                        <td className={t.td}>
                          <StatusChip tone={PRIORITY[ticket.priority]}>{ticket.priority}</StatusChip>
                        </td>
                        <td className={t.td}>
                          <StatusChip tone={tone}>{label}</StatusChip>
                        </td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>{formatDateTime(ticket.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </DataCard>

      <PlannedWork
        items={[
          'Status tabs (Open first) and a priority filter (service: listTickets(status)).',
          'Ticket page at /admin/support/[id] with the thread and a reply box (add getTicket and reply to the service).',
          'Change status and priority from the ticket page.',
          'Link each ticket to its merchant page (/admin/merchants/[id]).',
          'Phone layout: one card per ticket below 1024px.',
        ]}
      />
    </>
  );
}
