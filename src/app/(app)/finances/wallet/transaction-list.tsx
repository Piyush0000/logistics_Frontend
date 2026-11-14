import { ArrowDown, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
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
    badge: 'bg-error/15 text-error',
    amount: 'text-on-surface',
  },
  credit: {
    label: 'Credit',
    sign: '+',
    icon: ArrowDown,
    badge: 'bg-success/15 text-success',
    amount: 'text-success',
  },
};

function TransactionRow({ entry }: { entry: WalletTransaction }) {
  const { label, sign, icon: Icon, badge, amount } = DIRECTIONS[entry.direction];

  return (
    <li
      data-testid="transaction-row"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-control px-1 py-4 transition-colors duration-150 first:pt-1 last:pb-1 hover:bg-muted/60 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-2"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-control ${badge}`}>
        <Icon aria-hidden="true" className="size-5" />
        <span className="sr-only">{label}</span>
      </span>

      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="text-sm leading-5 font-medium sm:text-base sm:leading-6">{entry.title}</p>
        {entry.orderRef ? (
          <p className="text-sm leading-5 text-on-surface/70">
            Order: <span className="font-mono text-xs">{entry.orderRef}</span>
          </p>
        ) : null}
        {entry.breakdown ? (
          <p className="mt-0.5 text-xs leading-4 text-on-surface/70">
            Breakdown: Freight {formatPaise(entry.breakdown.freightPaise)} | Other{' '}
            {formatPaise(entry.breakdown.otherPaise)} | COD {formatPaise(entry.breakdown.codPaise)}
          </p>
        ) : null}
      </div>

      <div className="col-start-2 flex flex-wrap items-center justify-between gap-2 sm:col-start-3 sm:flex-col sm:items-end sm:justify-start">
        <span
          className={`font-mono text-base leading-6 font-medium tracking-tight whitespace-nowrap tabular-nums sm:text-right ${amount}`}
        >
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
  'inline-flex h-control items-center rounded-control border border-secondary bg-surface px-4 text-sm font-medium transition-colors duration-150';

function PageLink({ label, href }: { label: string; href: string | null }) {
  return href ? (
    <Link href={href} className={`${PAGE_BUTTON} hover:border-primary/40 hover:bg-muted`}>
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={`${PAGE_BUTTON} text-on-surface/60`}>
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
      <EmptyState
        message="No transactions match these filters."
        action={{ label: 'Show all transactions', href: WALLET_PATH }}
      />
    ) : (
      <EmptyState message="No transactions yet." />
    );
  }

  return (
    <>
      <ul className="grid divide-y divide-secondary/60">
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
