import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { RetryButton } from '@/app/(app)/dashboard/retry-button';
import { getDemoSession } from '@/lib/auth/session';
import { invoiceService } from '@/lib/data/invoices';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { InvoiceStatus } from '../invoice-table';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: 'Invoice | Evoc Logistics' };

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function Line({
  label,
  note,
  paise,
  strong = false,
}: {
  label: string;
  note?: string;
  paise: number;
  strong?: boolean;
}) {
  return (
    <tr className={strong ? 'border-t-2 border-on-surface font-semibold' : 'border-b border-secondary'}>
      <th scope="row" className="py-2.5 pr-3 text-left font-[inherit]">
        {label}
        {note ? <span className="block text-xs font-normal text-on-surface/60">{note}</span> : null}
      </th>
      <td className="py-2.5 text-right tabular-nums [overflow-wrap:anywhere]">{formatPaise(paise)}</td>
    </tr>
  );
}

/**
 * A page for printing at A4. It sits inside the signed-in app, so it checks the session, but it
 * has no sidebar or top bar, so only its own controls are hidden from the printout.
 */
export default async function InvoicePrintPage({ params }: InvoicePageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const result = await invoiceService().getInvoice(id);

  const back = (
    <Link
      href="/finances/invoices"
      // Written out here: a string exported from a client module is not a string in server code.
      className="inline-flex h-control items-center justify-center gap-2 rounded-control border border-secondary px-4 text-sm font-medium hover:bg-muted max-lg:h-11 print:hidden"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to invoices
    </Link>
  );

  if (!result.ok) {
    const missing = result.error.kind === 'not_found';
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-4 p-4 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-error/10 p-3">
          <p className="text-sm">
            {missing
              ? 'Invoice not found.'
              : result.error.kind === 'unauthorized'
                ? 'Sign in again to see this data.'
                : result.error.message}
          </p>
          {missing ? null : <RetryButton />}
        </div>
        <div>{back}</div>
      </main>
    );
  }

  const invoice = result.data;

  return (
    <main className="mx-auto grid w-full max-w-[210mm] gap-6 p-4 lg:p-8 print:max-w-none print:p-0">
      <style>{'@media print { @page { size: A4; margin: 15mm; } }'}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton />
      </div>

      <article className="grid gap-6 rounded-card border border-secondary bg-surface p-card print:rounded-none print:border-0 print:p-0">
        {result.source === 'mock' ? (
          <p
            data-testid="sample-invoice"
            className="rounded-control border border-primary bg-muted px-3 py-2 text-sm font-semibold"
          >
            Sample invoice. Not a tax document.
          </p>
        ) : null}

        <header className="grid gap-1">
          <h1 className="font-heading text-[28px] leading-9 font-bold break-words">Invoice</h1>
          <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">{invoice.number}</p>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Fact label="Issued">{formatDate(invoice.issuedAt)}</Fact>
          <Fact label="Status">
            <InvoiceStatus status={invoice.status} />
          </Fact>
          <Fact label="Shipments">{invoice.shipments.toLocaleString('en-IN')}</Fact>
          <div className="col-span-2 min-w-0 sm:col-span-3">
            <Fact label="Billing period">
              {formatDate(invoice.periodStart)} to {formatDate(invoice.periodEnd)}
            </Fact>
          </div>
        </dl>

        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Charges</caption>
          <thead>
            <tr className="border-b border-on-surface text-xs font-semibold">
              <th scope="col" className="py-2 pr-3 text-left">Charge</th>
              <th scope="col" className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <Line label="Freight" note="Shipping charges for the month" paise={invoice.freightPaise} />
            <Line label="COD fees" note="Cash on delivery handling" paise={invoice.codFeesPaise} />
            <Line label="Taxable value" paise={invoice.taxablePaise} />
            <Line label="GST at 18%" paise={invoice.gstPaise} />
            <Line label="Total" paise={invoice.totalPaise} strong />
          </tbody>
        </table>
      </article>
    </main>
  );
}
