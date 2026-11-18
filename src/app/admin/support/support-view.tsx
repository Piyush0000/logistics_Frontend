'use client';

import {
  ArrowRight,
  Filter,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { tableStyles as t } from '@/components/ui/table-styles';
import type {
  AdminTicket,
  AdminTicketPriority,
  AdminTicketStatus,
} from '@/lib/admin/data/support';
import { formatDateTime } from '@/lib/format/date';

export type SupportTab = 'open' | 'awaiting_merchant' | 'resolved' | 'all';

const STATUS_CONFIG: Record<AdminTicketStatus, { label: string; tone: ChipTone }> = {
  open: { label: 'Open', tone: 'warning' },
  awaiting_merchant: { label: 'Awaiting merchant', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const PRIORITY_CONFIG: Record<AdminTicketPriority, { label: string; tone: ChipTone }> = {
  high: { label: 'High', tone: 'error' },
  normal: { label: 'Normal', tone: 'neutral' },
  low: { label: 'Low', tone: 'neutral' },
};

const PAGE_SIZE = 10;

export function SupportView({
  allTickets,
  initialTab = 'open',
  initialPriority = '',
  initialQuery = '',
  initialMerchant = '',
  initialPage = 1,
}: {
  allTickets: AdminTicket[];
  initialTab?: SupportTab;
  initialPriority?: string;
  initialQuery?: string;
  initialMerchant?: string;
  initialPage?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<SupportTab>(initialTab);
  const [priorityFilter, setPriorityFilter] = useState<string>(initialPriority);
  const [searchVal, setSearchVal] = useState<string>(initialQuery);
  const [merchantFilter, setMerchantFilter] = useState<string>(initialMerchant);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      open: allTickets.filter((t) => t.status === 'open').length,
      awaiting_merchant: allTickets.filter((t) => t.status === 'awaiting_merchant').length,
      resolved: allTickets.filter((t) => t.status === 'resolved').length,
      all: allTickets.length,
    };
  }, [allTickets]);

  // URL sync helper
  const updateUrl = (
    tab: SupportTab,
    prio: string,
    query: string,
    merchant: string,
    page: number,
  ) => {
    const params = new URLSearchParams();
    // Always written, including 'all': the page defaults to Open when status is missing.
    params.set('status', tab);
    if (prio) {
      params.set('priority', prio);
    }
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (merchant) {
      params.set('merchant', merchant);
    }
    if (page > 1) {
      params.set('page', String(page));
    }

    const qs = params.toString();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    }
  };

  const handleTabChange = (tab: SupportTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    updateUrl(tab, priorityFilter, searchVal, merchantFilter, 1);
  };

  const handlePriorityChange = (prio: string) => {
    setPriorityFilter(prio);
    setCurrentPage(1);
    updateUrl(activeTab, prio, searchVal, merchantFilter, 1);
  };

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    setCurrentPage(1);
    updateUrl(activeTab, priorityFilter, val, merchantFilter, 1);
  };

  const clearMerchantFilter = () => {
    setMerchantFilter('');
    setCurrentPage(1);
    updateUrl(activeTab, priorityFilter, searchVal, '', 1);
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      // Status tab
      if (activeTab !== 'all' && ticket.status !== activeTab) {
        return false;
      }
      // Priority filter
      if (priorityFilter && ticket.priority !== priorityFilter) {
        return false;
      }
      // Merchant filter
      if (merchantFilter && ticket.merchantId !== merchantFilter) {
        return false;
      }
      // Query filter
      if (searchVal.trim()) {
        const q = searchVal.trim().toLowerCase();
        const matchesId = ticket.id.toLowerCase().includes(q);
        const matchesSubject = ticket.subject.toLowerCase().includes(q);
        const matchesMerchant = ticket.merchantName.toLowerCase().includes(q);
        const matchesCategory = ticket.category.toLowerCase().includes(q);
        if (!matchesId && !matchesSubject && !matchesMerchant && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [allTickets, activeTab, priorityFilter, merchantFilter, searchVal]);

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / PAGE_SIZE) || 1;
  const pagedTickets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, currentPage]);

  const buildHref = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('status', activeTab);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (searchVal.trim()) params.set('q', searchVal.trim());
    if (merchantFilter) params.set('merchant', merchantFilter);
    if (pageNumber > 1) {
      params.set('page', String(pageNumber));
    } else {
      params.delete('page');
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const tabs: Array<{ id: SupportTab; label: string; count: number }> = [
    { id: 'open', label: 'Open', count: tabCounts.open },
    { id: 'awaiting_merchant', label: 'Awaiting merchant', count: tabCounts.awaiting_merchant },
    { id: 'resolved', label: 'Resolved', count: tabCounts.resolved },
    { id: 'all', label: 'All tickets', count: tabCounts.all },
  ];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-outline/20 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`admin-support-tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface/70 hover:bg-surface/80 hover:text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive
                    ? 'bg-on-primary/20 text-on-primary'
                    : 'bg-surface text-on-surface/60 border border-outline/20'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Instant Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/50" />
          <input
            type="text"
            data-testid="admin-support-search"
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tickets by ID, subject, merchant..."
            className="w-full rounded-xl border border-outline/20 bg-surface pl-10 pr-9 py-2 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface/50 hover:bg-surface-elevated hover:text-on-surface"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-on-surface/50 hidden sm:inline-block" />
          <label htmlFor="priority-filter" className="sr-only">
            Filter by priority
          </label>
          <select
            id="priority-filter"
            data-testid="admin-support-priority-filter"
            value={priorityFilter}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="rounded-xl border border-outline/20 bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
          >
            <option value="">All priorities</option>
            <option value="high">High priority</option>
            <option value="normal">Normal priority</option>
            <option value="low">Low priority</option>
          </select>
        </div>
      </div>

      {/* Active Merchant Filter Pill */}
      {merchantFilter && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-on-surface/70">
            Filtered by merchant:{' '}
            <strong className="text-on-surface">
              {allTickets.find((t) => t.merchantId === merchantFilter)?.merchantName || merchantFilter}
            </strong>
          </span>
          <button
            type="button"
            onClick={clearMerchantFilter}
            className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-0.5 font-medium text-secondary hover:bg-secondary/30"
          >
            Clear merchant filter <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Results Table / Cards */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-outline/20 bg-surface p-8 text-center">
          <EmptyState message="No tickets found matching your filters." />
          {(searchVal || priorityFilter || merchantFilter || activeTab !== 'open') && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('open');
                setPriorityFilter('');
                setSearchVal('');
                setMerchantFilter('');
                setCurrentPage(1);
                updateUrl('open', '', '', '', 1);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table (hidden below 1024px) */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-outline/20 bg-surface shadow-xs">
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>Ticket</th>
                    <th className={t.th}>Merchant</th>
                    <th className={t.th}>Category</th>
                    <th className={t.th}>Priority</th>
                    <th className={t.th}>Status</th>
                    <th className={t.th}>Updated</th>
                    <th className={`${t.th} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTickets.map((ticket) => {
                    const statusConf = STATUS_CONFIG[ticket.status] || {
                      label: ticket.status,
                      tone: 'neutral' as ChipTone,
                    };
                    const priorityConf = PRIORITY_CONFIG[ticket.priority] || {
                      label: ticket.priority,
                      tone: 'neutral' as ChipTone,
                    };

                    return (
                      <tr
                        key={ticket.id}
                        data-testid="admin-ticket-row"
                        className={`${t.rowHover} transition-colors`}
                      >
                        <td className={t.td}>
                          <Link
                            href={`/admin/support/${ticket.id}`}
                            className="group block font-semibold text-on-surface hover:text-primary transition-colors"
                          >
                            <span className="line-clamp-1">{ticket.subject}</span>
                            <span className="font-mono text-xs text-on-surface/50 group-hover:text-primary/70">
                              {ticket.id}
                            </span>
                          </Link>
                        </td>
                        <td className={t.td}>
                          <Link
                            href={`/admin/merchants/${ticket.merchantId}`}
                            className="font-medium text-on-surface/90 hover:text-primary hover:underline transition-colors"
                          >
                            {ticket.merchantName}
                          </Link>
                        </td>
                        <td className={t.td}>
                          <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-xs font-medium text-on-surface/80 border border-outline/10">
                            {ticket.category}
                          </span>
                        </td>
                        <td className={t.td}>
                          <StatusChip tone={priorityConf.tone}>{priorityConf.label}</StatusChip>
                        </td>
                        <td className={t.td}>
                          <StatusChip tone={statusConf.tone}>{statusConf.label}</StatusChip>
                        </td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>
                          {formatDateTime(ticket.updatedAt)}
                        </td>
                        <td className={`${t.td} text-right`}>
                          <Link
                            href={`/admin/support/${ticket.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          >
                            View thread <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout (< 1024px) */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {pagedTickets.map((ticket) => {
              const statusConf = STATUS_CONFIG[ticket.status] || {
                label: ticket.status,
                tone: 'neutral' as ChipTone,
              };
              const priorityConf = PRIORITY_CONFIG[ticket.priority] || {
                label: ticket.priority,
                tone: 'neutral' as ChipTone,
              };

              return (
                <div
                  key={ticket.id}
                  data-testid="admin-ticket-card"
                  className="rounded-2xl border border-outline/20 bg-surface p-4 shadow-xs transition-shadow hover:shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {ticket.id}
                      </span>
                      <span className="ml-2 rounded-md bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-on-surface/80 border border-outline/10">
                        {ticket.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusChip tone={priorityConf.tone}>{priorityConf.label}</StatusChip>
                      <StatusChip tone={statusConf.tone}>{statusConf.label}</StatusChip>
                    </div>
                  </div>

                  <Link
                    href={`/admin/support/${ticket.id}`}
                    className="block group"
                  >
                    <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors text-base line-clamp-2">
                      {ticket.subject}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between pt-2 border-t border-outline/10 text-xs text-on-surface/70">
                    <div>
                      From:{' '}
                      <Link
                        href={`/admin/merchants/${ticket.merchantId}`}
                        className="font-medium text-on-surface hover:text-primary hover:underline"
                      >
                        {ticket.merchantName}
                      </Link>
                    </div>
                    <span>{formatDateTime(ticket.updatedAt)}</span>
                  </div>

                  <Link
                    href={`/admin/support/${ticket.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors min-h-[44px]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Open ticket thread
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-outline/10 pt-4">
              <span className="text-xs text-on-surface/60">
                Showing {pagedTickets.length} of {filteredTickets.length} tickets
              </span>
              <Pagination
                page={currentPage}
                pageCount={totalPages}
                buildHref={buildHref}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
