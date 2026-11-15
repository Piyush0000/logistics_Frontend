'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { OnboardDialog } from './onboard-dialog';

/** The search box, the Onboard seller button and its result message, around the list `children`. */
export function SubMerchantList({
  q,
  path,
  children,
}: {
  q: string;
  path: string;
  children: ReactNode;
}) {
  const searchId = useId();
  const [onboarding, setOnboarding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Form key={q} action={path} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end">
          <div className="min-w-0">
            <label htmlFor={searchId} className={FIELD_LABEL}>
              Search by name
            </label>
            <input
              id={searchId}
              name="q"
              type="search"
              defaultValue={q}
              maxLength={100}
              className="h-11 w-full min-w-0 rounded-control border border-secondary bg-surface px-3 text-base focus:border-primary focus:outline-none lg:h-control lg:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={`${SECONDARY_BUTTON} max-sm:h-11 max-sm:flex-1`}>
              Search
            </button>
            {q ? (
              <Link
                href={path}
                className={`${SECONDARY_BUTTON} inline-flex items-center justify-center max-sm:h-11 max-sm:flex-1`}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </Form>
        <button
          type="button"
          onClick={() => setOnboarding(true)}
          className={`${PRIMARY_BUTTON} max-sm:h-11 max-sm:w-full`}
        >
          Onboard seller
        </button>
      </div>

      {message ? (
        <p role="status" className="rounded-control bg-success/15 p-3 text-sm [overflow-wrap:anywhere]">
          {message}
        </p>
      ) : null}

      {children}

      {onboarding ? (
        <OnboardDialog onClose={() => setOnboarding(false)} onDone={(text) => setMessage(text)} />
      ) : null}
    </div>
  );
}
