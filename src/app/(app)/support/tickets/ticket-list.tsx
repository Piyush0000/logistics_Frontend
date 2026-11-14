import Link from 'next/link';
import { CATEGORY_LABELS, type Ticket } from '@/lib/data/support';
import { tableStyles } from '@/components/ui/table-styles';
import { formatDateTime } from '@/lib/format/date';
import { TicketStatusBadge } from './ticket-status';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

/** The tickets as a table on desktop and cards on phones. Each one opens its conversation. */
export function TicketList({ items }: { items: Ticket[] }) {
  return (
    <div className="grid gap-4">
      <div className={`hidden lg:block ${tableStyles.wrap}`}>
        <table aria-label="Support tickets" className={tableStyles.table}>
          <thead>
            <tr>
              <th scope="col" className={`${tableStyles.th} pl-6`}>Subject</th>
              <th scope="col" className={tableStyles.th}>Category</th>
              <th scope="col" className={tableStyles.th}>AWB</th>
              <th scope="col" className={tableStyles.th}>Status</th>
              <th scope="col" className={`${tableStyles.th} pr-6`}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ticket) => (
              <tr key={ticket.id} data-testid="ticket-row" className={tableStyles.rowHover}>
                <td className={`${tableStyles.td} max-w-md pl-6 font-medium [overflow-wrap:anywhere]`}>
                  <Link href={`/support/tickets/${ticket.id}`} className="text-primary hover:underline">
                    {ticket.subject}
                  </Link>
                </td>
                <td className={`${tableStyles.td} whitespace-nowrap`}>{CATEGORY_LABELS[ticket.category]}</td>
                <td className={`${tableStyles.td} max-w-48 font-mono text-xs [overflow-wrap:anywhere]`}>
                  {ticket.awb ?? 'None'}
                </td>
                <td className={tableStyles.td}>
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className={`${tableStyles.td} pr-6 whitespace-nowrap text-on-surface/70`}>
                  {formatDateTime(ticket.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="motion-stagger grid gap-3 lg:hidden">
        {items.map((ticket) => (
          <li key={ticket.id} data-testid="ticket-item">
            <Link
              href={`/support/tickets/${ticket.id}`}
              className="lift grid min-h-11 gap-3 rounded-card border border-secondary bg-surface p-card"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 font-heading text-base leading-6 font-bold tracking-tight [overflow-wrap:anywhere]">{ticket.subject}</p>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-3 gap-y-2 text-sm">
                <Fact label="Category" value={CATEGORY_LABELS[ticket.category]} />
                <Fact label="AWB" value={ticket.awb ?? 'None'} />
                <Fact label="Updated" value={formatDateTime(ticket.updatedAt)} />
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
