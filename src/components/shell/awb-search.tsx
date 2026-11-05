'use client';

import { LoaderCircle } from 'lucide-react';
import { useCallback, useRef, useState, useTransition, type FormEvent } from 'react';
import { searchAwbAction, type AwbSearchResult } from '@/app/(app)/actions';
import { SampleBadge } from '@/components/sample-badge';
import { MAX_AWBS, parseAwbQuery } from '@/lib/awb';
import { statusLabel } from '@/lib/format/status';
import { useDismiss } from './use-dismiss';

function Results({ result }: { result: AwbSearchResult }) {
  const usesSamples = result.lookups.some(({ source }) => source === 'mock');

  return (
    <div
      data-testid="awb-results"
      className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60dvh] overflow-y-auto rounded-card border border-secondary bg-surface p-4 shadow-lg shadow-muted"
    >
      {result.error ? <p className="text-sm">{result.error}</p> : null}
      {usesSamples ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-on-surface/70">
          <SampleBadge />
          Try DEMOEK001 or DEMODL002
        </div>
      ) : null}
      <ul className="grid gap-3">
        {result.lookups.map(({ awb, tracking, error }) => (
          <li key={awb} className="min-w-0 border-b border-secondary pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-semibold break-all">{awb}</p>
            {tracking ? (
              <>
                <p className="text-sm text-primary">{statusLabel(tracking.status)}</p>
                <p className="text-xs text-on-surface/70">{tracking.carrier}</p>
                {tracking.location ? (
                  <p className="text-xs text-on-surface/70">{tracking.location}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-on-surface/70">{error}</p>
            )}
          </li>
        ))}
      </ul>
      {result.truncated ? (
        <p className="mt-3 text-xs text-on-surface/70">Showing the first {MAX_AWBS} AWBs.</p>
      ) : null}
    </div>
  );
}

export function AwbSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AwbSearchResult | null>(null);
  const [pending, startTransition] = useTransition();
  const container = useRef<HTMLFormElement>(null);
  const close = useCallback(() => setResult(null), []);

  useDismiss(container, result !== null, close);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (parseAwbQuery(query).awbs.length === 0) return;
    startTransition(async () => {
      const next = await searchAwbAction(query);
      setResult(next);
    });
  }

  return (
    <form ref={container} role="search" onSubmit={handleSubmit} className="relative min-w-0 flex-1">
      <div className="flex">
        <span className="flex h-control shrink-0 items-center rounded-l-control bg-primary px-3 text-sm font-medium text-tertiary">
          AWB
        </span>
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            aria-label="Search AWB"
            placeholder=" "
            enterKeyHint="search"
            autoCapitalize="characters"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="peer h-control w-full rounded-r-control border border-l-0 border-secondary bg-surface px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary lg:text-sm"
          />
          {/* A real placeholder can't change with screen size, and the long hint gets cut off. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center truncate text-on-surface/50 peer-[:not(:placeholder-shown)]:hidden lg:text-sm"
          >
            <span className="sm:hidden">Search AWB</span>
            <span className="hidden sm:inline">Search AWB separated by comma</span>
          </span>
          {pending ? (
            <LoaderCircle
              aria-hidden="true"
              className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-primary"
            />
          ) : null}
        </div>
      </div>
      {result ? <Results result={result} /> : null}
    </form>
  );
}
