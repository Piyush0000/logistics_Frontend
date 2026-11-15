'use client';

import { ChevronRight, MapPin, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { tableStyles as t } from '@/components/ui/table-styles';
import { matchesQuery } from '@/lib/admin/data/common';
import type { KycStatus, MerchantStatus, MerchantSummary } from '@/lib/admin/data/merchants';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';

const STATUS_TONE: Record<MerchantStatus, ChipTone> = { active: 'success', pending: 'warning', suspended: 'error' };
const KYC_LABEL: Record<KycStatus, [string, ChipTone]> = {
  not_started: ['Not started', 'neutral'],
  submitted: ['In review', 'warning'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'error'],
};

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Suspended', value: 'suspended' },
];

const PAGE_SIZE = 10;

export function MerchantsView({
  allMerchants,
  initialQuery,
}: {
  allMerchants: MerchantSummary[];
  initialQuery: { q?: string; status?: MerchantStatus; page?: number };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = useState(initialQuery.q || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialQuery.status || '');
  const [currentPage, setCurrentPage] = useState<number>(initialQuery.page || 1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if URL changes externally (e.g. browser back/forward buttons)
  const urlQ = searchParams.get('q') || '';
  const urlStatus = searchParams.get('status') || '';
  const [prevUrlState, setPrevUrlState] = useState({ q: urlQ, status: urlStatus });

  if (prevUrlState.q !== urlQ || prevUrlState.status !== urlStatus) {
    setPrevUrlState({ q: urlQ, status: urlStatus });
    setSearchVal(urlQ);
    setSelectedStatus(urlStatus);
  }

  // Sync with browser URL without reloading page
  const syncUrl = (newQ: string, newStatus: string, newPage: number) => {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set('q', newQ.trim());
    if (newStatus) params.set('status', newStatus);
    if (newPage > 1) params.set('page', String(newPage));

    const qs = params.toString();
    const targetUrl = qs ? `${pathname}?${qs}` : pathname;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', targetUrl);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    setCurrentPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl(val, selectedStatus, 1);
    }, 200);
  };

  const handleClear = () => {
    setSearchVal('');
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    syncUrl('', selectedStatus, 1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    syncUrl(searchVal, status, 1);
  };

  // Instant in-memory filtering: updates immediately on EVERY keystroke
  const filteredMerchants = useMemo(() => {
    return allMerchants.filter((merchant) => {
      const matchesStatus = !selectedStatus || merchant.status === selectedStatus;
      const matchesText = matchesQuery(
        searchVal,
        merchant.name,
        merchant.email,
        merchant.city,
        merchant.id,
      );
      return matchesStatus && matchesText;
    });
  }, [allMerchants, selectedStatus, searchVal]);

  const totalFiltered = filteredMerchants.length;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const page = Math.min(Math.max(currentPage, 1), pageCount);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMerchants.slice(start, start + PAGE_SIZE);
  }, [filteredMerchants, page]);

  const buildHref = (targetPage: number) => {
    const p = new URLSearchParams();
    if (searchVal.trim()) p.set('q', searchVal.trim());
    if (selectedStatus) p.set('status', selectedStatus);
    if (targetPage > 1) p.set('page', String(targetPage));
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="grid gap-4">
      {/* Search and Status Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input with dynamic instant filtering */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
          />

          <input
            type="text"
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search merchant name, email, city, ID..."
            aria-label="Search merchants"
            className="h-11 w-full rounded-control border border-secondary bg-surface pr-9 pl-9 text-sm text-on-surface placeholder:text-on-surface/40 transition-colors focus:border-primary focus:outline-none lg:h-control"
          />

          {searchVal ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-on-surface/40 transition-colors hover:text-on-surface"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Status filter tabs */}
        <div
          role="tablist"
          aria-label="Merchant status tabs"
          className="flex items-center gap-1.5 overflow-x-auto rounded-control border border-secondary bg-surface p-1 [scrollbar-width:none]"
        >
          {STATUS_TABS.map((tab) => {
            const isSelected = selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleStatusChange(tab.value)}
                className={`h-9 min-w-16 shrink-0 rounded-control px-3 text-xs transition-all duration-150 sm:text-sm lg:h-8 ${
                  isSelected
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'font-medium text-on-surface/70 hover:bg-muted/60 hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Items view or Empty State */}
      {pagedItems.length === 0 ? (
        <EmptyState message="No merchants match these filters." />
      ) : (
        <>
          {/* Desktop table (>=1024px) */}
          <div className="hidden lg:block">
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>Merchant</th>
                    <th className={t.th}>City</th>
                    <th className={t.th}>Status</th>
                    <th className={t.th}>KYC</th>
                    <th className={`${t.th} text-right`}>Shipments (30 days)</th>
                    <th className={`${t.th} text-right`}>Wallet</th>
                    <th className={t.th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((merchant) => {
                    const [kycLabel, kycTone] = KYC_LABEL[merchant.kyc];
                    return (
                      <tr key={merchant.id} data-testid="admin-merchant-row" className={t.rowHover}>
                        <td className={t.td}>
                          <Link
                            href={`/admin/merchants/${merchant.id}`}
                            className="font-semibold text-primary transition-colors hover:underline"
                          >
                            {merchant.name}
                          </Link>
                          <div className="text-xs text-on-surface/60">{merchant.email}</div>
                        </td>
                        <td className={t.td}>{merchant.city}</td>
                        <td className={t.td}>
                          <StatusChip tone={STATUS_TONE[merchant.status]}>{merchant.status}</StatusChip>
                        </td>
                        <td className={t.td}>
                          <StatusChip tone={kycTone}>{kycLabel}</StatusChip>
                        </td>
                        <td className={t.tdNumeric}>{merchant.shipments30d.toLocaleString('en-IN')}</td>
                        <td className={`${t.tdNumeric} ${merchant.walletPaise < 0 ? 'text-error' : ''}`}>
                          {formatPaise(merchant.walletPaise)}
                        </td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>{formatDate(merchant.joinedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards (<1024px) */}
          <div className="grid gap-3 lg:hidden" data-testid="admin-merchants-mobile">
            {pagedItems.map((merchant) => {
              const [kycLabel, kycTone] = KYC_LABEL[merchant.kyc];
              const initials = merchant.name
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <Link
                  key={merchant.id}
                  href={`/admin/merchants/${merchant.id}`}
                  data-testid="admin-merchant-card"
                  className="group flex flex-col gap-3 rounded-control border border-secondary/70 bg-tertiary/30 p-3.5 transition-all duration-150 hover:border-primary/50 hover:bg-tertiary/60 active:scale-[0.99]"
                >
                  {/* Top Header: Avatar + Name/Email + Status Chip + Chevron */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/10 font-heading text-xs font-bold text-primary transition-colors group-hover:bg-primary/20">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-heading text-sm font-bold text-on-surface transition-colors group-hover:text-primary">
                          {merchant.name}
                        </div>
                        <div className="truncate text-xs text-on-surface/60">{merchant.email}</div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusChip tone={STATUS_TONE[merchant.status]}>{merchant.status}</StatusChip>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-on-surface/40 transition-colors group-hover:text-primary"
                      />
                    </div>
                  </div>

                  {/* Middle metadata: City & KYC Status & Joined */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-on-surface/70">
                      <MapPin aria-hidden="true" className="size-3 text-on-surface/40" />
                      <span>{merchant.city}</span>
                    </span>
                    <span className="text-on-surface/30">·</span>
                    <StatusChip tone={kycTone}>{kycLabel}</StatusChip>
                    <span className="text-on-surface/30">·</span>
                    <span className="text-on-surface/50">Joined {formatDate(merchant.joinedAt)}</span>
                  </div>

                  {/* Bottom stats row */}
                  <div className="grid grid-cols-2 gap-2 rounded-control border border-secondary/50 bg-surface/80 p-2.5 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-on-surface/60">Shipments (30d)</span>
                      <span className="mt-0.5 font-mono text-sm font-semibold text-on-surface">
                        {merchant.shipments30d.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-on-surface/60">Wallet</span>
                      <span
                        className={`mt-0.5 font-mono text-sm font-semibold ${
                          merchant.walletPaise < 0 ? 'text-error' : 'text-on-surface'
                        }`}
                      >
                        {formatPaise(merchant.walletPaise)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-secondary/60 pt-4">
            <span className="text-xs text-on-surface/60">
              Showing {pagedItems.length} of {totalFiltered} merchant{totalFiltered === 1 ? '' : 's'}
            </span>
            <Pagination
              page={page}
              pageCount={pageCount}
              buildHref={buildHref}
            />
          </div>
        </>
      )}
    </div>
  );
}
