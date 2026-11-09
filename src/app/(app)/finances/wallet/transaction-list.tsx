import { ArrowDown, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import type { WalletTransaction, WalletTransactionPage } from '@/lib/data/wallet';
import {
  hasActiveFilters,
  walletHref,
  WALLET_PATH,
  type WalletFilters,
} from '@/lib/data/wallet/filters';
import { formatDateTime } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

const DIRECTIONS = {
  debit: {
    label: 'Debit',
    sign: '-',
    icon: ArrowUp,
    badge: 'border-error text-error bg-error/10',
    amount: 'border-error/40 bg-error/10',
  },
  credit: {
    label: 'Credit',
    sign: '+',
    icon: ArrowDown,
    badge: 'border-success text-on-surface bg-success/10',
    amount: 'border-success/40 bg-success/10',
  },
};

function TransactionRow({ entry }: { entry: WalletTransaction }) {
  const { label, sign, icon: Icon, badge, amount } = DIRECTIONS[entry.direction];

  return (
    <li
      data-testid="transaction-row"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-secondary py-4 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4"
    >
      <span className={`grid size-10 place-items-center rounded-full border sm:size-11 ${badge}`}>
        <Icon aria-hidden="true" className="size-5" />
        <span className="sr-only">{label}</span>
      </span>

      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="text-sm leading-5 font-medium sm:text-base sm:leading-6">{entry.title}</p>
        {entry.orderRef ? (
          <p className="text-sm leading-5 text-on-surface/70">Order: {entry.orderRef}</p>
        ) : null}
        {entry.breakdown ? (
          <p className="mt-0.5 text-xs leading-4 text-on-surface/70">
            Breakdown: Freight {formatPaise(entry.breakdown.freightPaise)} | Other{' '}
            {formatPaise(entry.breakdown.otherPaise)} | COD {formatPaise(entry.breakdown.codPaise)}
          </p>
        ) : null}
      </div>

      <div className="col-start-2 flex flex-wrap items-center justify-between gap-2 sm:col-start-3 sm:flex-col sm:items-end sm:justify-start">
        <span className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${amount}`}>
          {sign}
          {formatPaise(entry.amountPaise)}
        </span>
        <span className="text-xs leading-4 text-on-surface/70 sm:text-sm sm:leading-5">
          {formatDateTime(entry.occurredAt)}
        </span>
      </div>
    </li>
  );
}

const PAGE_BUTTON =
  'inline-flex h-control items-center rounded-control border border-secondary px-4 text-sm font-medium';

function PageLink({ label, href }: { label: string; href: string | null }) {
  return href ? (
    <Link href={href} className={PAGE_BUTTON}>
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={`${PAGE_BUTTON} text-on-surface/70`}>
      {label}
    </span>
  );
}

export function TransactionList({
  result,
  filters,
}: {
  result: WalletTransactionPage;
  filters: WalletFilters;
}) {
  const { entries, page, pageCount } = result;

  if (entries.length === 0) {
    return hasActiveFilters(filters) ? (
      <p className="text-sm">
        No transactions match these filters.{' '}
        <Link href={WALLET_PATH} className="font-medium text-primary underline">
          Show all transactions
        </Link>
      </p>
    ) : (
      <p className="text-sm">No transactions yet.</p>
    );
  }

  return (
    <>
      <ul>
        {entries.map((entry) => (
          <TransactionRow key={entry.id} entry={entry} />
        ))}
      </ul>
      {pageCount > 1 ? (
        <nav
          aria-label="Transaction pages"
          data-testid="pagination"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-secondary pt-4"
        >
          <p className="text-sm text-on-surface/70">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-3">
            <PageLink label="Previous" href={page > 1 ? walletHref(filters, page - 1) : null} />
            <PageLink label="Next" href={page < pageCount ? walletHref(filters, page + 1) : null} />
          </div>
        </nav>
      ) : null}
    </>
  );
}
