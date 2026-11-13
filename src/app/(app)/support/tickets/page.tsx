import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { getDemoSession } from '@/lib/auth/session';
import { TICKET_STATUSES, supportService } from '@/lib/data/support';
import { walletService } from '@/lib/data/wallet';
import { buildPageHref, parseEnum, parsePage } from '@/lib/url-params';
import { NewTicketButton } from './new-ticket-button';
import { TicketList } from './ticket-list';
import { TicketsFilter } from './tickets-filter';

export const metadata: Metadata = { title: 'Support tickets | Evoc Ships' };

const PATH = '/support/tickets';

interface TicketsPageProps {
  searchParams: Promise<{ page?: string; status?: string; new?: string }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = parsePage(params.page);
  // A status that is not one of the three is ignored, so every status shows.
  const status = parseEnum(params.status, TICKET_STATUSES);

  const [wallet, tickets] = await Promise.all([
    walletService().getBalance(),
    supportService().listTickets({ status, page }),
  ]);
  const buildHref = (next: number) => buildPageHref(PATH, { status }, next);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Support tickets"
          description="Ask us about a shipment, pickup, payment or anything else. Replies appear in the ticket."
          // Raising a ticket needs the ticket service, so the button waits until it answers.
          actions={
            tickets.ok ? (
              <NewTicketButton startOpen={params.new === '1'} closeHref={buildHref(page)} />
            ) : null
          }
        />

        <TicketsFilter key={status ?? 'all'} status={status} path={PATH} />

        <DataCard testId="tickets-card" title="Tickets" result={tickets}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState message="No tickets match this filter. Clear the filter, or raise a new ticket." />
            ) : (
              <div className="grid gap-4">
                <TicketList items={data.items} />
                <Pagination page={data.page} pageCount={data.pageCount} buildHref={buildHref} />
              </div>
            )
          }
        </DataCard>
      </div>
    </AppShell>
  );
}
