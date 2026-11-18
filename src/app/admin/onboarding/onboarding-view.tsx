'use client';

import { ChevronRight, FileCheck, MapPin, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { tableStyles as t } from '@/components/ui/table-styles';
import { matchesQuery } from '@/lib/admin/data/common';
import type { ApplicationStatus, OnboardingApplication } from '@/lib/admin/data/onboarding';
import { formatDate, formatDateTime } from '@/lib/format/date';

const STATUS_TONE: Record<ApplicationStatus, ChipTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

interface StatusTabConfig {
  label: string;
  value: FilterStatus;
}

const TABS: StatusTabConfig[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: 'all' },
];

export function OnboardingView({
  allApplications,
  initialStatus = 'pending',
}: {
  allApplications: OnboardingApplication[];
  initialStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const validInitial = (['pending', 'approved', 'rejected', 'all'].includes(initialStatus)
    ? initialStatus
    : 'pending') as FilterStatus;

  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>(validInitial);
  const [searchVal, setSearchVal] = useState('');

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      pending: allApplications.filter((a) => a.status === 'pending').length,
      approved: allApplications.filter((a) => a.status === 'approved').length,
      rejected: allApplications.filter((a) => a.status === 'rejected').length,
      all: allApplications.length,
    };
  }, [allApplications]);

  const handleTabChange = (status: FilterStatus) => {
    setSelectedStatus(status);
    const targetUrl = status === 'pending' ? pathname : `${pathname}?status=${status}`;
    router.replace(targetUrl, { scroll: false });
  };

  const filteredApplications = useMemo(() => {
    return allApplications.filter((app) => {
      const matchesStatus =
        selectedStatus === 'all' ? true : app.status === selectedStatus;
      const matchesText = matchesQuery(
        searchVal,
        app.businessName,
        app.email,
        app.city,
        app.id,
        app.merchantId,
        app.gstin || undefined,
        app.pan || undefined,
      );
      return matchesStatus && matchesText;
    });
  }, [allApplications, selectedStatus, searchVal]);

  return (
    <div className="grid gap-4" data-testid="admin-onboarding-view">
      {/* Controls: Search and Status Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
          />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search business, email, city, PAN..."
            aria-label="Search applications"
            className="h-11 w-full rounded-control border border-secondary bg-surface pr-9 pl-9 text-sm text-on-surface placeholder:text-on-surface/40 transition-colors focus:border-primary focus:outline-none lg:h-control"
          />
          {searchVal ? (
            <button
              type="button"
              onClick={() => setSearchVal('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-on-surface/40 transition-colors hover:text-on-surface"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Status tabs */}
        <div
          role="tablist"
          aria-label="Application status tabs"
          className="flex items-center gap-1.5 overflow-x-auto rounded-control border border-secondary bg-surface p-1 [scrollbar-width:none]"
        >
          {TABS.map((tab) => {
            const isSelected = selectedStatus === tab.value;
            const count = counts[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={`admin-onboarding-tab-${tab.value}`}
                onClick={() => handleTabChange(tab.value)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3 text-xs font-semibold transition-colors duration-150 ${
                  isSelected
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface/70 hover:bg-tertiary hover:text-on-surface'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] ${
                    isSelected
                      ? 'bg-white/20 text-on-primary'
                      : 'bg-secondary text-on-surface/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {filteredApplications.length === 0 ? (
        <EmptyState message="No applications found matching your criteria." />
      ) : (
        <>
          {/* Desktop Table (>=1024px) */}
          <div className="hidden lg:block">
            <div className={t.wrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>Business</th>
                    <th className={t.th}>City</th>
                    <th className={t.th}>Submitted</th>
                    <th className={`${t.th} text-right`}>Documents</th>
                    <th className={t.th}>Status</th>
                    <th className={`${t.th} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application) => (
                    <tr
                      key={application.id}
                      data-testid="admin-application-row"
                      className={t.rowHover}
                    >
                      <td className={t.td}>
                        <Link
                          href={`/admin/onboarding/${application.id}`}
                          className="group block"
                        >
                          <div className="font-semibold text-on-surface transition-colors group-hover:text-primary">
                            {application.businessName}
                          </div>
                          <div className="text-xs text-on-surface/60">
                            {application.email}
                          </div>
                        </Link>
                      </td>
                      <td className={t.td}>
                        <div className="flex items-center gap-1 text-sm text-on-surface">
                          <MapPin aria-hidden="true" className="size-3.5 text-on-surface/40" />
                          <span>{application.city}</span>
                        </div>
                      </td>
                      <td className={`${t.td} text-xs text-on-surface/70`}>
                        {formatDateTime(application.submittedAt)}
                      </td>
                      <td className={t.tdNumeric}>
                        <span className="inline-flex items-center gap-1">
                          <FileCheck aria-hidden="true" className="size-3.5 text-success" />
                          <span className="font-mono text-xs">{application.documents.length} of 3</span>
                        </span>
                      </td>
                      <td className={t.td}>
                        <StatusChip tone={STATUS_TONE[application.status]}>
                          {application.status}
                        </StatusChip>
                      </td>
                      <td className={`${t.td} text-right`}>
                        <Link
                          href={`/admin/onboarding/${application.id}`}
                          data-testid="admin-application-review-link"
                          className="inline-flex h-8 items-center gap-1 rounded-control bg-secondary/80 px-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-primary hover:text-on-primary"
                        >
                          <span>Review</span>
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
          <div className="grid gap-3 lg:hidden" data-testid="admin-onboarding-mobile">
            {filteredApplications.map((application) => {
              const initials = application.businessName
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <Link
                  key={application.id}
                  href={`/admin/onboarding/${application.id}`}
                  data-testid="admin-application-card"
                  className="group flex flex-col gap-3 rounded-control border border-secondary/70 bg-tertiary/30 p-3.5 transition-all duration-150 hover:border-primary/50 hover:bg-tertiary/60 active:scale-[0.99]"
                >
                  {/* Top Header: Initials + Name/Email + Status Chip + Chevron */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/10 font-heading text-xs font-bold text-primary transition-colors group-hover:bg-primary/20">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-heading text-sm font-bold text-on-surface transition-colors group-hover:text-primary">
                          {application.businessName}
                        </div>
                        <div className="truncate text-xs text-on-surface/60">
                          {application.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusChip tone={STATUS_TONE[application.status]}>
                        {application.status}
                      </StatusChip>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-on-surface/40 transition-colors group-hover:text-primary"
                      />
                    </div>
                  </div>

                  {/* Middle row: City & Submitted Date */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-on-surface/70">
                      <MapPin aria-hidden="true" className="size-3 text-on-surface/40" />
                      <span>{application.city}</span>
                    </span>
                    <span className="text-on-surface/30">·</span>
                    <span className="text-on-surface/50">
                      Submitted {formatDate(application.submittedAt)}
                    </span>
                  </div>

                  {/* Bottom row: Document count & review hint */}
                  <div className="flex items-center justify-between rounded-control border border-secondary/50 bg-surface/80 px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-on-surface/70">
                      <FileCheck aria-hidden="true" className="size-3.5 text-success" />
                      <span>{application.documents.length} of 3 documents</span>
                    </span>
                    <span className="font-semibold text-primary group-hover:underline">
                      Review &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

