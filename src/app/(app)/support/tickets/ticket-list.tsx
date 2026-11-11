import Link from 'next/link';
import { CATEGORY_LABELS, type Ticket } from '@/lib/data/support';
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
      <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
        <table aria-label="Support tickets" className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
              <th scope="col" className="py-3.5 pr-4 pl-6">Subject</th>
              <th scope="col" className="px-4 py-3.5">Category</th>
              <th scope="col" className="px-4 py-3.5">AWB</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="py-3.5 pr-6 pl-4">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary">
            {items.map((ticket) => (
              <tr key={ticket.id} data-testid="ticket-row" className="hover:bg-tertiary/40">
                <td className="max-w-md py-4 pr-4 pl-6 font-medium [overflow-wrap:anywhere]">
                  <Link href={`/support/tickets/${ticket.id}`} className="text-primary hover:underline">
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">{CATEGORY_LABELS[ticket.category]}</td>
                <td className="max-w-48 px-4 py-4 [overflow-wrap:anywhere]">{ticket.awb ?? 'None'}</td>
                <td className="px-4 py-4">
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className="py-4 pr-6 pl-4 whitespace-nowrap">{formatDateTime(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 lg:hidden">
        {items.map((ticket) => (
          <li key={ticket.id} data-testid="ticket-item">
            <Link
              href={`/support/tickets/${ticket.id}`}
              className="grid min-h-11 gap-3 rounded-card border border-secondary bg-surface p-4 hover:border-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">{ticket.subject}</p>
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
