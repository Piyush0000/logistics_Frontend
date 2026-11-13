import { ArrowLeft } from 'lucide-react';
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
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Link
          href="/support/tickets"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-primary lg:min-h-0"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All tickets
        </Link>

        <PageHeader title={ticket?.subject ?? 'Support ticket'} />

        <DataCard testId="ticket-card" title="Conversation" result={result}>
          {(data) => (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
              <dl
                data-testid="ticket-meta"
                className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-4 gap-y-3 text-sm"
              >
                <div>
                  <dt className="text-xs text-on-surface/60">Status</dt>
                  <dd className="mt-0.5">
                    <TicketStatusBadge status={data.status} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-on-surface/60">Category</dt>
                  <dd>{CATEGORY_LABELS[data.category]}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-on-surface/60">AWB</dt>
                  <dd className="[overflow-wrap:anywhere]">{data.awb ?? 'None'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-on-surface/60">Updated</dt>
                  <dd>{formatDateTime(data.updatedAt)}</dd>
                </div>
              </dl>

              <ol className="grid gap-3">
                {data.messages.map((message, index) => (
                  <li
                    key={`${message.at}-${index}`}
                    data-testid="ticket-message"
                    className={`grid gap-1 rounded-card border p-4 ${
                      message.from === 'you' ? 'border-secondary bg-tertiary' : 'border-primary/30 bg-muted'
                    }`}
                  >
                    <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface/60">
                      <span className="font-semibold text-on-surface">
                        {message.from === 'you' ? 'You' : 'Support'}
                      </span>
                      <span>{formatDateTime(message.at)}</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
                  </li>
                ))}
              </ol>

              <ReplyForm id={data.id} resolved={data.status === 'resolved'} />
            </div>
          )}
        </DataCard>
      </div>
    </>
  );
}
