import { ChevronLeft, ChevronRight, CircleCheck, Hourglass, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { tableStyles } from '@/components/ui/table-styles';
import type { CodRemittance, CodRemittancePage, CodStatus } from '@/lib/data/cod';
import { codHref, COD_PATH, hasActiveCodFilters, type CodFilters } from '@/lib/data/cod/filters';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { RowsPerPage } from './rows-per-page';

const rupees = (paise: number) => formatPaise(paise, { decimals: 0 });

const STATUSES: Record<CodStatus, { label: string; icon: LucideIcon; tone: string }> = {
  pending: { label: 'Pending', icon: Hourglass, tone: 'bg-warning/15 text-warning' },
  settled: { label: 'Settled', icon: CircleCheck, tone: 'bg-success/15 text-success' },
};

function StatusPill({ status }: { status: CodStatus }) {
  const { label, icon: Icon, tone } = STATUSES[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-4 font-semibold whitespace-nowrap ${tone}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

function Deduction({ paise }: { paise: number }) {
  return paise > 0 ? (
    <span className="font-medium whitespace-nowrap text-error">-{rupees(paise)}</span>
  ) : (
    <>{rupees(0)}</>
  );
}

function OrderCell({ row }: { row: CodRemittance }) {
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <p className="font-mono text-sm leading-5 font-bold text-primary">{row.orderNumber}</p>
      <p className="text-xs leading-4 text-on-surface/60">AWB: {row.awb}</p>
    </div>
  );
}

/** Column headings; amount columns are right-aligned like their figures. */
const HEADINGS: { label: string; numeric?: boolean }[] = [
  { label: 'Order Number' },
  { label: 'Courier' },
  { label: 'COD Amount', numeric: true },
  { label: 'Deductions', numeric: true },
  { label: 'Remittable', numeric: true },
  { label: 'Status' },
  { label: 'Collected' },
  { label: 'Settled At' },
];

const { td, tdNumeric, th } = tableStyles;

function RemittanceDesktopTable({ entries }: { entries: CodRemittance[] }) {
  return (
    <div className={`${tableStyles.wrap} hidden xl:block`}>
      <table aria-label="COD remittances" className={tableStyles.table}>
        <thead>
          <tr>
            {HEADINGS.map(({ label, numeric }) => (
              <th
                key={label}
                scope="col"
                className={`${th} whitespace-nowrap ${numeric ? 'text-right' : ''}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((row) => (
            <tr
              key={row.id}
              data-testid="remittance-row"
              className={`${tableStyles.rowHover} [&:last-child>td]:border-b-0`}
            >
              <td className={td}>
                <OrderCell row={row} />
              </td>
              <td className={td}>{row.courier}</td>
              <td className={`${tdNumeric} whitespace-nowrap`}>{rupees(row.codPaise)}</td>
              <td className={`${tdNumeric} whitespace-nowrap`}>
                <Deduction paise={row.deductionsPaise} />
              </td>
              <td className={`${tdNumeric} font-semibold whitespace-nowrap`}>
                {rupees(row.remittablePaise)}
              </td>
              <td className={td}>
                <StatusPill status={row.status} />
              </td>
              <td className={`${td} whitespace-nowrap`}>{formatDate(row.collectedAt)}</td>
              <td className={`${td} whitespace-nowrap`}>
                {row.settledAt ? formatDate(row.settledAt) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardField({
  label,
  children,
  numeric = false,
}: {
  label: string;
  children: ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-4 text-on-surface/60">{label}</dt>
      <dd className={`mt-0.5 text-sm leading-5 ${numeric ? 'font-mono tabular-nums' : ''}`}>
        {children}
      </dd>
    </div>
  );
}

function RemittanceCards({ entries }: { entries: CodRemittance[] }) {
  return (
    <ul className="motion-stagger grid gap-3 xl:hidden">
      {entries.map((row, index) => (
        <li
          key={row.id}
          data-testid="remittance-row"
          style={{ '--i': Math.min(index, 10) } as CSSProperties}
          className="min-w-0 rounded-card border border-secondary bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <OrderCell row={row} />
            <StatusPill status={row.status} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CardField label="Courier">{row.courier}</CardField>
            <CardField label="COD Amount" numeric>
              {rupees(row.codPaise)}
            </CardField>
            <CardField label="Deductions" numeric>
              <Deduction paise={row.deductionsPaise} />
            </CardField>
            <CardField label="Remittable" numeric>
              <span className="font-semibold">{rupees(row.remittablePaise)}</span>
            </CardField>
            <CardField label="Collected">{formatDate(row.collectedAt)}</CardField>
            <CardField label="Settled At">
              {row.settledAt ? formatDate(row.settledAt) : '-'}
            </CardField>
          </dl>
        </li>
      ))}
    </ul>
  );
}

const ARROW =
  'grid size-control place-items-center rounded-control border border-secondary bg-surface transition-colors duration-150';

function PageArrow({
  label,
  icon: Icon,
  href,
}: {
  label: string;
  icon: LucideIcon;
  href: string | null;
}) {
  const arrow = <Icon aria-hidden="true" className="size-4" />;

  return href ? (
    <Link
      href={href}
      aria-label={label}
      className={`${ARROW} hover:border-primary/40 hover:bg-muted`}
    >
      {arrow}
    </Link>
  ) : (
    <span aria-disabled="true" aria-label={label} className={`${ARROW} text-on-surface/40`}>
      {arrow}
    </span>
  );
}

export function RemittanceTable({
  result,
  filters,
}: {
  result: CodRemittancePage;
  filters: CodFilters;
}) {
  const { entries, page, pageCount, first, last, total } = result;

  if (entries.length === 0) {
    return hasActiveCodFilters(filters) ? (
      <EmptyState
        message="No remittances match these filters."
        action={{ label: 'Show all remittances', href: COD_PATH }}
      />
    ) : (
      <EmptyState message="No remittances yet." />
    );
  }

  return (
    <>
      <nav
        aria-label="Remittance pages"
        data-testid="cod-pagination"
        className="mb-4 flex flex-wrap items-end justify-end gap-3"
      >
        <RowsPerPage filters={filters} />
        <div className="flex items-center gap-3">
          <p className="font-mono text-sm whitespace-nowrap text-on-surface/70 tabular-nums">
            {first}-{last} of {total}
          </p>
          <PageArrow
            label="Previous page"
            icon={ChevronLeft}
            href={page > 1 ? codHref(filters, { page: page - 1 }) : null}
          />
          <PageArrow
            label="Next page"
            icon={ChevronRight}
            href={page < pageCount ? codHref(filters, { page: page + 1 }) : null}
          />
        </div>
      </nav>
      <RemittanceDesktopTable entries={entries} />
      <RemittanceCards entries={entries} />
    </>
  );
}
