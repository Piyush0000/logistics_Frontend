'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { DateField } from '@/components/ui/date-field';
import { REPORT_CARDS, reportHref, validateReport } from '@/lib/reports';

const DOWNLOAD =
  'inline-flex h-control w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-on-primary sm:w-auto';

export function ReportForm({ initialFrom, initialTo }: { initialFrom: string; initialTo: string }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  // The type does not affect the date rules, so one report type checks the range for all.
  const check = validateReport({ type: 'shipments', from, to });

  return (
    <div className="grid gap-6">
      <section
        aria-label="Date range"
        className="rounded-card border border-secondary bg-surface p-card"
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <DateField label="From date" name="from" value={from} onChange={setFrom} />
          <DateField label="To date" name="to" value={to} onChange={setTo} />
        </div>
        <p className="mt-3 text-sm text-on-surface/70">The range can be up to 92 days.</p>
        {check.ok ? null : (
          <p role="alert" data-testid="report-error" className="mt-3 rounded-control bg-error/10 p-3 text-sm">
            {check.message}
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        {REPORT_CARDS.map((card) => (
          <section
            key={card.type}
            data-testid="report-card"
            aria-labelledby={`report-${card.type}`}
            className="flex min-w-0 flex-col justify-between gap-4 rounded-card border border-secondary bg-surface p-card"
          >
            <div>
              <h2
                id={`report-${card.type}`}
                className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8"
              >
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-on-surface/70">{card.description}</p>
            </div>
            {check.ok ? (
              <a href={reportHref({ type: card.type, from, to })} download className={DOWNLOAD}>
                <Download aria-hidden="true" className="size-4" />
                Download
                <span className="sr-only"> {card.title} report</span>
              </a>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
