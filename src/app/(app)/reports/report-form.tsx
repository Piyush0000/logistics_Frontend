'use client';

import { Banknote, CalendarRange, Download, PackageX, Truck, Undo2, Wallet, type LucideIcon } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { DateField } from '@/components/ui/date-field';
import { REPORT_CARDS, reportHref, validateReport, type ReportType } from '@/lib/reports';

/** An icon chip per report, toned by meaning as on Home: returns and failures in warm tones. */
const REPORT_ICON: Record<ReportType, { icon: LucideIcon; chip: string }> = {
  shipments: { icon: Truck, chip: 'bg-muted text-primary' },
  ndr: { icon: PackageX, chip: 'bg-warning/15 text-warning' },
  rto: { icon: Undo2, chip: 'bg-error/15 text-error' },
  wallet: { icon: Wallet, chip: 'bg-accent/15 text-accent dark:text-primary' },
  cod: { icon: Banknote, chip: 'bg-success/15 text-success' },
};

const DOWNLOAD =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[.97] sm:w-auto lg:h-control';

export function ReportForm({ initialFrom, initialTo }: { initialFrom: string; initialTo: string }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  // The type does not affect the date rules, so one report type checks the range for all.
  const check = validateReport({ type: 'shipments', from, to });

  return (
    <div className="grid gap-6">
      <section
        aria-label="Date range"
        className="motion-rise rounded-card border border-secondary bg-surface p-card"
      >
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-muted text-primary">
            <CalendarRange aria-hidden="true" className="size-5" />
          </span>
          <p className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">Date range</p>
        </div>
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

      <div className="motion-stagger grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {REPORT_CARDS.map((card, index) => {
          const { icon: Icon, chip } = REPORT_ICON[card.type];
          return (
          <section
            key={card.type}
            data-testid="report-card"
            aria-labelledby={`report-${card.type}`}
            style={{ '--i': index } as CSSProperties}
            className="flex min-w-0 flex-col justify-between gap-4 rounded-card border border-secondary bg-surface p-card"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-control ${chip}`}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2
                  id={`report-${card.type}`}
                  className="font-heading text-lg leading-7 font-bold tracking-tight break-words lg:text-xl"
                >
                  {card.title}
                </h2>
                <p className="mt-1 text-sm text-on-surface/70">{card.description}</p>
              </div>
            </div>
            {check.ok ? (
              <a href={reportHref({ type: card.type, from, to })} download className={DOWNLOAD}>
                <Download aria-hidden="true" className="size-4" />
                Download
                <span className="sr-only"> {card.title} report</span>
              </a>
            ) : null}
          </section>
          );
        })}
      </div>
    </div>
  );
}
