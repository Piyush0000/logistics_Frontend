import { ChevronRight, Eye } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { tableStyles } from '@/components/ui/table-styles';
import type { Invoice } from '@/lib/data/invoices';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

const invoiceHref = (invoice: Invoice) => `/finances/invoices/${encodeURIComponent(invoice.id)}`;

const formatPeriod = (invoice: Invoice) =>
  `${formatDate(invoice.periodStart)} to ${formatDate(invoice.periodEnd)}`;

const STATUS_STYLES: Record<Invoice['status'], { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'bg-success/15 text-success' },
  due: { label: 'Due', tone: 'bg-warning/15 text-warning' },
};

export function InvoiceStatus({ status }: { status: Invoice['status'] }) {
  const { label, tone } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-4 font-semibold print:bg-transparent print:p-0 ${tone}`}
    >
      {label}
    </span>
  );
}

const { th, td, tdNumeric } = tableStyles;
const AMOUNT = `${tdNumeric} whitespace-nowrap`;

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className={`${tableStyles.wrap} hidden lg:block`}>
      <table aria-label="Invoices" className={tableStyles.table}>
        <thead>
          <tr>
            <th scope="col" className={th}>Invoice number</th>
            <th scope="col" className={th}>Period</th>
            <th scope="col" className={`${th} text-right`}>Shipments</th>
            <th scope="col" className={`${th} text-right`}>Taxable</th>
            <th scope="col" className={`${th} text-right`}>GST</th>
            <th scope="col" className={`${th} text-right`}>Total</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={`${th} text-right`}>View</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              data-testid="invoice-row"
              className={`${tableStyles.rowHover} [&:last-child>td]:border-b-0`}
            >
              <td className={`${td} max-w-56 font-mono text-[13px] font-semibold [overflow-wrap:anywhere]`}>
                {invoice.number}
              </td>
              <td className={`${td} text-on-surface/80`}>{formatPeriod(invoice)}</td>
              <td className={AMOUNT}>{invoice.shipments.toLocaleString('en-IN')}</td>
              <td className={AMOUNT}>{formatPaise(invoice.taxablePaise)}</td>
              <td className={AMOUNT}>{formatPaise(invoice.gstPaise)}</td>
              <td className={`${AMOUNT} font-semibold`}>{formatPaise(invoice.totalPaise)}</td>
              <td className={td}>
                <InvoiceStatus status={invoice.status} />
              </td>
              <td className={`${td} text-right`}>
                <Link
                  href={invoiceHref(invoice)}
                  className="inline-flex h-8 items-center gap-1 rounded-control border border-secondary bg-surface px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 hover:border-primary/40 hover:bg-muted hover:text-primary"
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
      <dd
        className={`font-mono tabular-nums [overflow-wrap:anywhere] ${strong ? 'font-semibold' : 'font-medium'}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function InvoiceCards({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="motion-stagger grid gap-3 lg:hidden">
      {invoices.map((invoice, index) => (
        <article
          key={invoice.id}
          data-testid="invoice-item"
          style={{ '--i': index } as CSSProperties}
          className="grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold [overflow-wrap:anywhere] text-primary">
                {invoice.number}
              </p>
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
            className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-secondary px-3 text-sm font-medium transition-colors duration-150 hover:border-primary/40 hover:bg-muted hover:text-primary"
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
