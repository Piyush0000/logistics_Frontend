import { ChevronRight, Eye } from 'lucide-react';
import Link from 'next/link';
import type { Invoice } from '@/lib/data/invoices';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

const invoiceHref = (invoice: Invoice) => `/finances/invoices/${encodeURIComponent(invoice.id)}`;

const formatPeriod = (invoice: Invoice) =>
  `${formatDate(invoice.periodStart)} to ${formatDate(invoice.periodEnd)}`;

const STATUS_STYLES: Record<Invoice['status'], { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'bg-success/15' },
  due: { label: 'Due', tone: 'bg-warning/15' },
};

export function InvoiceStatus({ status }: { status: Invoice['status'] }) {
  const { label, tone } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

const AMOUNT = 'px-4 py-4 text-right tabular-nums whitespace-nowrap';

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
      <table aria-label="Invoices" className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
            <th scope="col" className="py-3.5 pr-4 pl-6">Invoice number</th>
            <th scope="col" className="px-4 py-3.5">Period</th>
            <th scope="col" className="px-4 py-3.5 text-right">Shipments</th>
            <th scope="col" className="px-4 py-3.5 text-right">Taxable</th>
            <th scope="col" className="px-4 py-3.5 text-right">GST</th>
            <th scope="col" className="px-4 py-3.5 text-right">Total</th>
            <th scope="col" className="px-4 py-3.5">Status</th>
            <th scope="col" className="py-3.5 pr-6 pl-4 text-right">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary">
          {invoices.map((invoice) => (
            <tr key={invoice.id} data-testid="invoice-row" className="hover:bg-tertiary/40">
              <td className="max-w-56 py-4 pr-4 pl-6 font-medium [overflow-wrap:anywhere]">
                {invoice.number}
              </td>
              <td className="px-4 py-4">{formatPeriod(invoice)}</td>
              <td className={AMOUNT}>{invoice.shipments.toLocaleString('en-IN')}</td>
              <td className={AMOUNT}>{formatPaise(invoice.taxablePaise)}</td>
              <td className={AMOUNT}>{formatPaise(invoice.gstPaise)}</td>
              <td className={`${AMOUNT} font-medium`}>{formatPaise(invoice.totalPaise)}</td>
              <td className="px-4 py-4">
                <InvoiceStatus status={invoice.status} />
              </td>
              <td className="py-4 pr-6 pl-4 text-right">
                <Link
                  href={invoiceHref(invoice)}
                  className="inline-flex h-8 items-center gap-1 rounded-control border border-secondary bg-surface px-2.5 text-xs font-medium whitespace-nowrap hover:border-primary hover:text-primary"
                >
                  <Eye aria-hidden="true" className="size-3" />
                  View<span className="sr-only"> {invoice.number}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className={`[overflow-wrap:anywhere] ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

export function InvoiceCards({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="grid gap-3 lg:hidden">
      {invoices.map((invoice) => (
        <article
          key={invoice.id}
          data-testid="invoice-item"
          className="grid gap-3 rounded-card border border-secondary bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold [overflow-wrap:anywhere]">{invoice.number}</p>
              <p className="text-xs text-on-surface/60">{formatPeriod(invoice)}</p>
            </div>
            <InvoiceStatus status={invoice.status} />
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-3 gap-y-2 text-sm">
            <Fact label="Shipments" value={invoice.shipments.toLocaleString('en-IN')} />
            <Fact label="Taxable" value={formatPaise(invoice.taxablePaise)} />
            <Fact label="GST" value={formatPaise(invoice.gstPaise)} />
            <Fact label="Total" value={formatPaise(invoice.totalPaise)} strong />
          </dl>
          <Link
            href={invoiceHref(invoice)}
            className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-secondary px-3 text-sm font-medium hover:border-primary hover:text-primary"
          >
            <span className="inline-flex items-center gap-2">
              <Eye aria-hidden="true" className="size-4" />
              View<span className="sr-only"> {invoice.number}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 text-on-surface/40" />
          </Link>
        </article>
      ))}
    </div>
  );
}
