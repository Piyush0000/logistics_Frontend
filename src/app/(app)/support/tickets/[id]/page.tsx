import { ArrowLeft, Headset, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { CATEGORY_LABELS, supportService } from '@/lib/data/support';
import { formatDateTime } from '@/lib/format/date';
import { TicketStatusBadge } from '../ticket-status';
import { ReplyForm } from './reply-form';

export const metadata: Metadata = { title: 'Support ticket | Evoc Ships' };

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const result = await supportService().getTicket(id);
  if (!result.ok && result.error.kind === 'not_found') notFound();

  const ticket = result.ok ? result.data : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:gap-5">
      <Link
        href="/support/tickets"
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-primary lg:min-h-0"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All tickets
      </Link>

      <PageHeader title={ticket?.subject ?? 'Support ticket'} />

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        {result.ok ? (
          <div className="min-w-0 xl:sticky xl:top-24 xl:col-start-2 xl:row-start-1">
            <DataCard testId="ticket-details-card" title="Details" result={result}>
              {(data) => (
                <dl
                  data-testid="ticket-meta"
                  className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-4 gap-y-4 text-sm xl:grid-cols-1"
                >
                  <div>
                    <dt className="text-xs text-on-surface/60">Status</dt>
                    <dd className="mt-1">
                      <TicketStatusBadge status={data.status} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-on-surface/60">Category</dt>
                    <dd className="mt-0.5 font-medium">{CATEGORY_LABELS[data.category]}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-on-surface/60">AWB</dt>
                    <dd className="mt-0.5 font-mono [overflow-wrap:anywhere]">{data.awb ?? 'None'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-on-surface/60">Updated</dt>
                    <dd className="mt-0.5">{formatDateTime(data.updatedAt)}</dd>
                  </div>
                </dl>
              )}
            </DataCard>
          </div>
        ) : null}
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <DataCard testId="ticket-card" title="Conversation" result={result}>
            {(data) => (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
                <ol className="motion-stagger grid gap-3">
                  {data.messages.map((message, index) => {
                    const mine = message.from === 'you';
                    const Icon = mine ? UserRound : Headset;
                    return (
                      <li
                        key={`${message.at}-${index}`}
                        data-testid="ticket-message"
                        className={`flex min-w-0 gap-3 rounded-card border p-4 ${
                          mine ? 'border-secondary bg-tertiary' : 'border-primary/30 bg-muted'
                        }`}
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-control ${
                            mine ? 'bg-surface text-on-surface/70' : 'bg-primary text-on-primary'
                          }`}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <div className="grid min-w-0 flex-1 gap-1">
                          <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface/60">
                            <span className="font-semibold text-on-surface">{mine ? 'You' : 'Support'}</span>
                            <span>{formatDateTime(message.at)}</span>
                          </p>
                          <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="border-t border-secondary pt-5">
                  <ReplyForm id={data.id} resolved={data.status === 'resolved'} />
                </div>
              </div>
            )}
          </DataCard>
        </div>
      </div>
    </div>
  );
}
