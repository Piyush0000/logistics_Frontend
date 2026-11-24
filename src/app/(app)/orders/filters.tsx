'use client';

import { Filter, Plus, Search, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Manifested', value: 'MANIFESTED' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'RTO in progress', value: 'RTO_INITIATED' },
  { label: 'RTO delivered', value: 'RTO_DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
];

const CARRIERS = [
  { label: 'All Carriers', value: '' },
  { label: 'Delhivery', value: 'delhivery' },
  { label: 'Ekart', value: 'ekart' },
  { label: 'Shadowfax', value: 'shadowfax' },
];

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentStatus = searchParams.get('status') || '';
  const currentCarrier = searchParams.get('carrier') || '';
  const currentSearch = searchParams.get('search') || '';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="grid gap-4">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-secondary bg-surface p-3">
        {/* Search input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50"
          />
          <input
            type="search"
            defaultValue={currentSearch}
            placeholder="Search AWB, Reference ID..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParam('search', (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => updateParam('search', e.target.value)}
            className="h-control w-full rounded-control border border-secondary bg-tertiary/60 pr-3 pl-9 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none"
          />
        </div>

        {/* Carrier filter & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-control border border-secondary bg-tertiary/60 px-2">
            <Filter aria-hidden="true" className="size-4 text-on-surface/50" />
            <select
              value={currentCarrier}
              onChange={(e) => updateParam('carrier', e.target.value)}
              aria-label="Filter by carrier"
              className="h-control bg-transparent text-sm font-medium text-on-surface focus:outline-none"
            >
              {CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/ndr"
            className="flex h-control items-center gap-1.5 rounded-control border border-secondary bg-surface px-3 text-sm font-medium text-on-surface transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            <Undo2 aria-hidden="true" className="size-4" />
            <span>NDR</span>
          </Link>

          <Link
            href="/orders/create"
            className="flex h-control items-center gap-1.5 rounded-control bg-primary px-3 text-sm font-semibold text-on-primary shadow-[0_4px_14px_rgb(24_62_235/0.25)] transition-colors duration-150 hover:bg-primary/90"
          >
            <Plus aria-hidden="true" className="size-4" />
            <span>Create Shipment</span>
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Shipment status tabs"
        className="flex gap-1 overflow-x-auto rounded-card border border-secondary bg-surface p-1.5 [scrollbar-width:none] max-sm:pr-6 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]"
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
              className={`h-11 min-w-20 shrink-0 rounded-control px-4 text-xs transition-colors duration-150 sm:text-sm lg:h-10 ${
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
  );
}

