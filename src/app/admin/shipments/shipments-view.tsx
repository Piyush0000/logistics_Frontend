'use client';

import {
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { tableStyles as t } from '@/components/ui/table-styles';
import { matchesQuery } from '@/lib/admin/data/common';
import type {
  AdminNdrShipment,
  AdminRtoShipment,
  AdminShipment,
} from '@/lib/admin/data/shipments';
import { formatDateTime } from '@/lib/format/date';

type ShipmentsTab = 'all' | 'stuck' | 'ndr' | 'rto';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Manifested', value: 'MANIFESTED' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'RTO Initiated', value: 'RTO_INITIATED' },
  { label: 'Failed', value: 'FAILED' },
];

export function ShipmentsView({
  allShipments,
  showNdr = true,
  allNdrShipments,
  allRtoShipments,
  merchantsList,
  initialTab = 'all',
  initialQuery = {},
}: {
  allShipments: AdminShipment[];
  /** False while NDR has no backend: the tab is left out. */
  showNdr?: boolean;
  allNdrShipments: AdminNdrShipment[];
  allRtoShipments: AdminRtoShipment[];
  merchantsList: { id: string; name: string }[];
  initialTab?: ShipmentsTab;
  initialQuery?: { q?: string; status?: string; merchantId?: string; stuck?: boolean; page?: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<ShipmentsTab>(
    initialQuery.stuck ? 'stuck' : initialTab,
  );
  const [searchVal, setSearchVal] = useState(initialQuery.q || '');
  const [selectedStatus, setSelectedStatus] = useState(initialQuery.status || '');
  const [selectedMerchant, setSelectedMerchant] = useState(initialQuery.merchantId || '');
  const [currentPage, setCurrentPage] = useState(initialQuery.page || 1);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: allShipments.length,
      stuck: allShipments.filter((s) => s.stuck).length,
      ndr: allNdrShipments.length,
      rto: allRtoShipments.length,
    };
  }, [allShipments, allNdrShipments, allRtoShipments]);

  // Handle Tab Switch
  const handleTabChange = (tab: ShipmentsTab) => {
    setActiveTab(tab);
    setCurrentPage(1);

    const params = new URLSearchParams();
    if (tab === 'stuck') params.set('stuck', '1');
    if (tab === 'ndr') params.set('view', 'ndr');
    if (tab === 'rto') params.set('view', 'rto');
    if (searchVal.trim()) params.set('q', searchVal.trim());
    if (selectedStatus && tab === 'all') params.set('status', selectedStatus);
    if (selectedMerchant) params.set('merchantId', selectedMerchant);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Sync state with URL without full reload
  const updateUrl = (
    newQ: string,
    newStatus: string,
    newMerchant: string,
    page: number,
  ) => {
    const params = new URLSearchParams();
    if (activeTab === 'stuck') params.set('stuck', '1');
    if (activeTab === 'ndr') params.set('view', 'ndr');
    if (activeTab === 'rto') params.set('view', 'rto');
    if (newQ.trim()) params.set('q', newQ.trim());
    if (newStatus && activeTab === 'all') params.set('status', newStatus);
    if (newMerchant) params.set('merchantId', newMerchant);
    if (page > 1) params.set('page', String(page));

    const qs = params.toString();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    setCurrentPage(1);
    updateUrl(val, selectedStatus, selectedMerchant, 1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    updateUrl(searchVal, status, selectedMerchant, 1);
  };

  const handleMerchantChange = (merchantId: string) => {
    setSelectedMerchant(merchantId);
    setCurrentPage(1);
    updateUrl(searchVal, selectedStatus, merchantId, 1);
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setSelectedStatus('');
    setSelectedMerchant('');
    setCurrentPage(1);
    updateUrl('', '', '', 1);
  };

  // Filter Data based on Active Tab & Controls
  const filteredItems = useMemo(() => {
    if (activeTab === 'ndr') {
      return allNdrShipments.filter((s) => {
        const matchesMerchant = !selectedMerchant || s.merchantId === selectedMerchant;
        const matchesText = matchesQuery(searchVal, s.awb, s.merchantName, s.carrier, s.ndrReason);
        return matchesMerchant && matchesText;
      });
    }

    if (activeTab === 'rto') {
      return allRtoShipments.filter((s) => {
        const matchesMerchant = !selectedMerchant || s.merchantId === selectedMerchant;
        const matchesText = matchesQuery(searchVal, s.awb, s.merchantName, s.carrier, s.rtoReason);
        return matchesMerchant && matchesText;
      });
    }

    // Tab 'all' or 'stuck'
    return allShipments.filter((s) => {
      const matchesStuck = activeTab === 'stuck' ? s.stuck : true;
      const matchesStatus = !selectedStatus || s.status === selectedStatus;
      const matchesMerchant = !selectedMerchant || s.merchantId === selectedMerchant;
      const matchesText = matchesQuery(searchVal, s.awb, s.merchantName, s.carrier);
      return matchesStuck && matchesStatus && matchesMerchant && matchesText;
    });
  }, [activeTab, allShipments, allNdrShipments, allRtoShipments, searchVal, selectedStatus, selectedMerchant]);

  // Paginated Slicing
  const totalCount = filteredItems.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), pageCount);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage]);

  const buildHref = (page: number) => {
    const p = new URLSearchParams(searchParams.toString());
    if (page > 1) p.set('page', String(page));
    else p.delete('page');
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const hasActiveFilters = Boolean(searchVal || selectedStatus || selectedMerchant);

  return (
    <div className="grid gap-4" data-testid="admin-shipments-view">
      {/* Top Tabs: All Shipments, Stuck, NDR, RTO */}
      <div
        role="tablist"
        aria-label="Shipment category tabs"
        className="flex items-center gap-1.5 overflow-x-auto rounded-control border border-secondary bg-surface p-1 [scrollbar-width:none]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          data-testid="admin-shipments-tab-all"
          onClick={() => handleTabChange('all')}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-xs font-semibold transition-colors ${
            activeTab === 'all'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface/70 hover:bg-tertiary hover:text-on-surface'
          }`}
        >
          <span>All shipments</span>
          <span
            className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] ${
              activeTab === 'all' ? 'bg-on-primary/20 text-on-primary' : 'bg-secondary text-on-surface/60'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stuck'}
          data-testid="admin-shipments-tab-stuck"
          onClick={() => handleTabChange('stuck')}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-xs font-semibold transition-colors ${
            activeTab === 'stuck'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface/70 hover:bg-tertiary hover:text-on-surface'
          }`}
        >
          <AlertTriangle aria-hidden="true" className="size-3.5" />
          <span>Stuck only</span>
          <span
            className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] ${
              activeTab === 'stuck' ? 'bg-on-primary/20 text-on-primary' : 'bg-secondary text-on-surface/60'
            }`}
          >
            {counts.stuck}
          </span>
        </button>

        {showNdr ? (
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ndr'}
          data-testid="admin-shipments-tab-ndr"
          onClick={() => handleTabChange('ndr')}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-xs font-semibold transition-colors ${
            activeTab === 'ndr'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface/70 hover:bg-tertiary hover:text-on-surface'
          }`}
        >
          <span>NDR reports</span>
          <span
            className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] ${
              activeTab === 'ndr' ? 'bg-on-primary/20 text-on-primary' : 'bg-secondary text-on-surface/60'
            }`}
          >
            {counts.ndr}
          </span>
        </button>
        ) : null}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rto'}
          data-testid="admin-shipments-tab-rto"
          onClick={() => handleTabChange('rto')}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3.5 text-xs font-semibold transition-colors ${
            activeTab === 'rto'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface/70 hover:bg-tertiary hover:text-on-surface'
          }`}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          <span>RTO</span>
          <span
            className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] ${
              activeTab === 'rto' ? 'bg-on-primary/20 text-on-primary' : 'bg-secondary text-on-surface/60'
            }`}
          >
            {counts.rto}
          </span>
        </button>
      </div>

      {/* Filter Row: Search, Status Dropdown, Merchant Dropdown */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
          />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search AWB, merchant, courier..."
            aria-label="Search shipments"
            className="h-11 w-full rounded-control border border-secondary bg-surface pr-9 pl-9 text-sm text-on-surface placeholder:text-on-surface/40 transition-colors focus:border-primary focus:outline-none lg:h-control"
          />
          {searchVal ? (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-on-surface/40 transition-colors hover:text-on-surface"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'all' ? (
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Filter by status"
              data-testid="admin-shipments-status-filter"
              className="h-11 rounded-control border border-secondary bg-surface px-3 text-xs font-semibold text-on-surface transition-colors focus:border-primary focus:outline-none lg:h-control"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}

          {/* Merchant Filter */}
          <select
            value={selectedMerchant}
            onChange={(e) => handleMerchantChange(e.target.value)}
            aria-label="Filter by merchant"
            data-testid="admin-shipments-merchant-filter"
            className="h-11 max-w-[180px] truncate rounded-control border border-secondary bg-surface px-3 text-xs font-semibold text-on-surface transition-colors focus:border-primary focus:outline-none lg:h-control"
          >
            <option value="">All merchants</option>
            {merchantsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex h-11 items-center gap-1 rounded-control border border-secondary px-3 text-xs font-semibold text-on-surface/70 transition-colors hover:bg-tertiary hover:text-on-surface lg:h-control"
            >
              <X aria-hidden="true" className="size-3.5" />
              <span>Reset</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <EmptyState message="No shipments match these filters." />
      ) : (
        <>
          {/* Desktop Table (>=1024px) */}
          <div className="hidden lg:block">
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  {activeTab === 'ndr' ? (
                    <tr>
                      <th className={t.th}>AWB</th>
                      <th className={t.th}>Merchant</th>
                      <th className={t.th}>Carrier</th>
                      <th className={t.th}>NDR Reason</th>
                      <th className={`${t.th} text-center`}>Attempts</th>
                      <th className={t.th}>Action Required</th>
                      <th className={`${t.th} text-right`}>Action</th>
                    </tr>
                  ) : activeTab === 'rto' ? (
                    <tr>
                      <th className={t.th}>AWB</th>
                      <th className={t.th}>Merchant</th>
                      <th className={t.th}>Carrier</th>
                      <th className={t.th}>RTO Reason</th>
                      <th className={t.th}>Initiated Date</th>
                      <th className={t.th}>Status</th>
                      <th className={`${t.th} text-right`}>Action</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className={t.th}>AWB</th>
                      <th className={t.th}>Merchant</th>
                      <th className={t.th}>Carrier</th>
                      <th className={t.th}>Status</th>
                      <th className={t.th}>Last update</th>
                      <th className={`${t.th} text-right`}>Action</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {activeTab === 'ndr'
                    ? (pagedItems as AdminNdrShipment[]).map((shipment) => (
                        <tr
                          key={shipment.awb}
                          data-testid="admin-shipment-row"
                          className={t.rowHover}
                        >
                          <td className={t.td}>
                            <Link
                              href={`/admin/shipments/${shipment.awb}`}
                              className="font-mono font-semibold text-primary hover:underline"
                            >
                              {shipment.awb}
                            </Link>
                          </td>
                          <td className={t.td}>{shipment.merchantName}</td>
                          <td className={t.td}>
                            <CarrierBadge carrier={shipment.carrier} />
                          </td>
                          <td className={`${t.td} text-xs font-medium text-error`}>
                            {shipment.ndrReason}
                          </td>
                          <td className={`${t.td} text-center font-mono text-xs`}>
                            <span className="rounded-full bg-error/15 px-2 py-0.5 font-bold text-error">
                              {shipment.attemptsCount}
                            </span>
                          </td>
                          <td className={`${t.td} text-xs text-on-surface/80`}>
                            {shipment.actionRequired}
                          </td>
                          <td className={`${t.td} text-right`}>
                            <Link
                              href={`/admin/shipments/${shipment.awb}`}
                              className="inline-flex h-8 items-center gap-1 rounded-control bg-secondary/80 px-2.5 text-xs font-semibold text-on-surface hover:bg-primary hover:text-on-primary"
                            >
                              <span>Track</span>
                              <ChevronRight aria-hidden="true" className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    : activeTab === 'rto'
                    ? (pagedItems as AdminRtoShipment[]).map((shipment) => (
                        <tr
                          key={shipment.awb}
                          data-testid="admin-shipment-row"
                          className={t.rowHover}
                        >
                          <td className={t.td}>
                            <Link
                              href={`/admin/shipments/${shipment.awb}`}
                              className="font-mono font-semibold text-primary hover:underline"
                            >
                              {shipment.awb}
                            </Link>
                          </td>
                          <td className={t.td}>{shipment.merchantName}</td>
                          <td className={t.td}>
                            <CarrierBadge carrier={shipment.carrier} />
                          </td>
                          <td className={`${t.td} text-xs font-medium text-on-surface/80`}>
                            {shipment.rtoReason}
                          </td>
                          <td className={`${t.td} text-xs text-on-surface/70`}>
                            {formatDateTime(shipment.rtoInitiatedAt)}
                          </td>
                          <td className={t.td}>
                            <StatusBadge status="RTO_INITIATED" />
                          </td>
                          <td className={`${t.td} text-right`}>
                            <Link
                              href={`/admin/shipments/${shipment.awb}`}
                              className="inline-flex h-8 items-center gap-1 rounded-control bg-secondary/80 px-2.5 text-xs font-semibold text-on-surface hover:bg-primary hover:text-on-primary"
                            >
                              <span>Track</span>
                              <ChevronRight aria-hidden="true" className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    : (pagedItems as AdminShipment[]).map((shipment) => (
                        <tr
                          key={shipment.awb}
                          data-testid="admin-shipment-row"
                          className={t.rowHover}
                        >
                          <td className={t.td}>
                            <Link
                              href={`/admin/shipments/${shipment.awb}`}
                              className="font-mono font-semibold text-primary hover:underline"
                            >
                              {shipment.awb}
                            </Link>
                          </td>
                          <td className={t.td}>
                            <Link
                              href={`/admin/merchants/${shipment.merchantId}`}
                              className="hover:underline"
                            >
                              {shipment.merchantName}
                            </Link>
                          </td>
                          <td className={t.td}>
                            <CarrierBadge carrier={shipment.carrier} />
                          </td>
                          <td className={t.td}>
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={shipment.status} />
                              {shipment.stuck ? (
                                <StatusChip tone="warning">Stuck</StatusChip>
                              ) : null}
                            </span>
                          </td>
                          <td className={`${t.td} text-xs text-on-surface/70`}>
                            {formatDateTime(shipment.lastEventAt)}
                          </td>
                          <td className={`${t.td} text-right`}>
                            <Link
                              href={`/admin/shipments/${shipment.awb}`}
                              data-testid="admin-shipment-track-link"
                              className="inline-flex h-8 items-center gap-1 rounded-control bg-secondary/80 px-2.5 text-xs font-semibold text-on-surface hover:bg-primary hover:text-on-primary"
                            >
                              <span>Track</span>
                              <ChevronRight aria-hidden="true" className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards (<1024px) */}
          <div className="grid gap-3 lg:hidden" data-testid="admin-shipments-mobile">
            {pagedItems.map((shipment) => {
              const isNdr = 'ndrReason' in shipment;
              const isRto = 'rtoReason' in shipment;

              return (
                <Link
                  key={shipment.awb}
                  href={`/admin/shipments/${shipment.awb}`}
                  data-testid="admin-shipment-card"
                  className="group flex flex-col gap-3 rounded-control border border-secondary/70 bg-tertiary/30 p-3.5 transition-all duration-150 hover:border-primary/50 hover:bg-tertiary/60 active:scale-[0.99]"
                >
                  {/* Top Row: AWB + Status + Chevron */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary group-hover:underline">
                        {shipment.awb}
                      </span>
                      <CarrierBadge carrier={shipment.carrier} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={shipment.status} />
                      {shipment.stuck ? (
                        <StatusChip tone="warning">Stuck</StatusChip>
                      ) : null}
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-on-surface/40 transition-colors group-hover:text-primary"
                      />
                    </div>
                  </div>

                  {/* Middle: Merchant name */}
                  <div className="text-xs text-on-surface/70">
                    Merchant:{' '}
                    <span className="font-semibold text-on-surface">
                      {shipment.merchantName}
                    </span>
                  </div>

                  {/* Specific NDR or RTO callout */}
                  {isNdr ? (
                    <div className="rounded-control border border-error/30 bg-error/10 p-2 text-xs text-error">
                      <span className="font-semibold">Reason:</span> {(shipment as AdminNdrShipment).ndrReason}
                    </div>
                  ) : null}

                  {isRto ? (
                    <div className="rounded-control border border-secondary bg-surface p-2 text-xs text-on-surface/80">
                      <span className="font-semibold">RTO Reason:</span> {(shipment as AdminRtoShipment).rtoReason}
                    </div>
                  ) : null}

                  {/* Bottom: Last updated */}
                  <div className="flex items-center justify-between border-t border-secondary/50 pt-2 text-[11px] text-on-surface/50">
                    <span>Last update: {formatDateTime(shipment.lastEventAt)}</span>
                    <span className="font-semibold text-primary">View timeline &rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-secondary/60 pt-4">
            <span className="text-xs text-on-surface/60">
              Showing {pagedItems.length} of {totalCount} shipment{totalCount === 1 ? '' : 's'}
            </span>
            <Pagination
              page={safePage}
              pageCount={pageCount}
              buildHref={buildHref}
            />
          </div>
        </>
      )}
    </div>
  );
}
