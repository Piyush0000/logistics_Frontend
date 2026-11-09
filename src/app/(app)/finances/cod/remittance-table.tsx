import { ChevronLeft, ChevronRight, CircleCheck, Hourglass, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CodRemittance, CodRemittancePage, CodStatus } from '@/lib/data/cod';
import { codHref, COD_PATH, hasActiveCodFilters, type CodFilters } from '@/lib/data/cod/filters';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { RowsPerPage } from './rows-per-page';

const rupees = (paise: number) => formatPaise(paise, { decimals: 0 });

const STATUSES: Record<CodStatus, { label: string; icon: LucideIcon; tone: string }> = {
  pending: { label: 'Pending', icon: Hourglass, tone: 'border-warning/40 bg-warning/10' },
  settled: { label: 'Settled', icon: CircleCheck, tone: 'border-success/40 bg-success/10' },
};

function StatusPill({ status }: { status: CodStatus }) {
  const { label, icon: Icon, tone } = STATUSES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium ${tone}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

function Deduction({ paise }: { paise: number }) {
  return paise > 0 ? (
    <span className="rounded-control bg-error/10 px-1.5 py-0.5 font-medium">-{rupees(paise)}</span>
  ) : (
    <>{rupees(0)}</>
  );
}

function OrderCell({ row }: { row: CodRemittance }) {
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <p className="text-sm leading-5 font-medium text-primary">{row.orderNumber}</p>
      <p className="text-xs leading-4 text-on-surface/70">AWB: {row.awb}</p>
    </div>
  );
}

const HEADINGS = [
  'Order Number',
  'Courier',
  'COD Amount',
  'Deductions',
  'Remittable',
  'Status',
  'Collected',
  'Settled At',
];

const CELL = 'px-3 py-3 first:pl-0 last:pr-0';

function RemittanceDesktopTable({ entries }: { entries: CodRemittance[] }) {
  return (
    <table aria-label="COD remittances" className="hidden w-full text-left text-sm xl:table">
      <thead>
        <tr className="border-b border-secondary">
          {HEADINGS.map((heading) => (
            <th key={heading} scope="col" className={`${CELL} font-semibold whitespace-nowrap`}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((row) => (
          <tr
            key={row.id}
            data-testid="remittance-row"
            className="border-b border-secondary last:border-b-0"
          >
            <td className={CELL}>
              <OrderCell row={row} />
            </td>
            <td className={CELL}>{row.courier}</td>
            <td className={CELL}>{rupees(row.codPaise)}</td>
            <td className={CELL}>
              <Deduction paise={row.deductionsPaise} />
            </td>
            <td className={`${CELL} font-medium`}>{rupees(row.remittablePaise)}</td>
            <td className={CELL}>
              <StatusPill status={row.status} />
            </td>
            <td className={`${CELL} whitespace-nowrap`}>{formatDate(row.collectedAt)}</td>
            <td className={`${CELL} whitespace-nowrap`}>
              {row.settledAt ? formatDate(row.settledAt) : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-4 text-on-surface/70">{label}</dt>
      <dd className="mt-0.5 text-sm leading-5">{children}</dd>
    </div>
  );
}

function RemittanceCards({ entries }: { entries: CodRemittance[] }) {
  return (
    <ul className="xl:hidden">
      {entries.map((row) => (
        <li
          key={row.id}
          data-testid="remittance-row"
          className="border-b border-secondary py-4 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="flex items-start justify-between gap-2">
            <OrderCell row={row} />
            <StatusPill status={row.status} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CardField label="Courier">{row.courier}</CardField>
            <CardField label="COD Amount">{rupees(row.codPaise)}</CardField>
            <CardField label="Deductions">
              <Deduction paise={row.deductionsPaise} />
            </CardField>
            <CardField label="Remittable">
              <span className="font-medium">{rupees(row.remittablePaise)}</span>
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

const ARROW = 'grid size-control place-items-center rounded-control border border-secondary';

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
    <Link href={href} aria-label={label} className={ARROW}>
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
      <p className="text-sm">
        No remittances match these filters.{' '}
        <Link href={COD_PATH} className="font-medium text-primary underline">
          Show all remittances
        </Link>
      </p>
    ) : (
      <p className="text-sm">No remittances yet.</p>
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
          <p className="text-sm whitespace-nowrap text-on-surface/70">
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
