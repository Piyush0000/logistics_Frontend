'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Suspended', value: 'suspended' },
];

export function MerchantFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentStatus = searchParams.get('status') || '';
  const currentQuery = searchParams.get('q') || '';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1 on filter change
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-secondary bg-surface p-3">
        {/* Search input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
          />
          <input
            type="search"
            defaultValue={currentQuery}
            placeholder="Search merchant name, email, city, ID..."
            aria-label="Search merchants"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParam('q', (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => updateParam('q', e.target.value)}
            className="h-11 w-full rounded-control border border-secondary bg-tertiary/60 pr-3 pl-9 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none lg:h-control"
          />
        </div>

        {/* Status filter tabs */}
        <div
          role="tablist"
          aria-label="Merchant status tabs"
          className="flex gap-1 overflow-x-auto rounded-card border border-secondary bg-surface p-1 [scrollbar-width:none]"
        >
          {STATUS_TABS.map((tab) => {
            const isSelected = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                disabled={pending}
                onClick={() => updateParam('status', tab.value)}
                className={`h-11 min-w-16 shrink-0 rounded-control px-3.5 text-xs transition-colors duration-150 sm:text-sm lg:h-control ${
                  isSelected
                    ? 'bg-muted font-semibold text-primary'
                    : 'font-medium text-on-surface/70 hover:bg-muted/60 hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
