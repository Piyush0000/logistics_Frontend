'use client';

import { Loader2, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

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
  const [searchVal, setSearchVal] = useState(currentQuery);
  const [prevQuery, setPrevQuery] = useState(currentQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state during render when URL query param changes externally
  if (prevQuery !== currentQuery) {
    setPrevQuery(currentQuery);
    setSearchVal(currentQuery);
  }

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

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam('q', val);
    }, 250);
  };

  const handleClear = () => {
    setSearchVal('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateParam('q', '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      updateParam('q', searchVal);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input with live debounce and spinner */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          {pending ? (
            <Loader2
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-primary"
            />
          ) : (
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
            />
          )}

          <input
            type="text"
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
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
            const isSelected = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                disabled={pending}
                onClick={() => updateParam('status', tab.value)}
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
    </div>
  );
}
