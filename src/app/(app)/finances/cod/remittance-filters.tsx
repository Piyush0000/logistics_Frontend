'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { COD_PATH, COD_STATUSES, type CodFilters } from '@/lib/data/cod/filters';
import { DATE_ORDER_ERROR } from '@/lib/data/wallet/filters';
import { DateField } from '../wallet/date-field';
import { SelectField } from '../wallet/select-field';

export function RemittanceFilters({
  filters,
  error: urlError,
}: {
  filters: CodFilters;
  error: string | null;
}) {
  const [status, setStatus] = useState(filters.status);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [error, setError] = useState(urlError);

  function changeDate(setDate: (day: string) => void) {
    return (day: string) => {
      setDate(day);
      setError(null);
    };
  }

  function handleSubmit(event: FormEvent) {
    if (from && to && from > to) {
      event.preventDefault();
      setError(DATE_ORDER_ERROR);
    }
  }

  return (
    <section
      aria-label="Filter remittances"
      className="rounded-card border border-secondary bg-surface p-card"
    >
      <Form
        action={COD_PATH}
        onSubmit={handleSubmit}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <SelectField
          label="Status"
          name="status"
          value={status}
          options={COD_STATUSES}
          onChange={setStatus}
        />
        <DateField label="From Date" name="from" value={from} onChange={changeDate(setFrom)} />
        <DateField label="To Date" name="to" value={to} onChange={changeDate(setTo)} />
        {/* Keeps the chosen page size when filters are applied. */}
        <input type="hidden" name="perPage" value={filters.perPage} />

        <div className="flex gap-3 self-end md:justify-end">
          <button
            type="submit"
            className="h-control flex-1 rounded-control bg-primary px-6 text-sm font-medium text-tertiary md:flex-none"
          >
            Apply
          </button>
          <Link
            href={COD_PATH}
            className="inline-flex h-control flex-1 items-center justify-center rounded-control border border-secondary px-4 text-sm font-medium md:flex-none"
          >
            Clear
          </Link>
        </div>
      </Form>

      {error ? (
        <p
          role="alert"
          data-testid="filter-error"
          className="mt-4 rounded-control bg-error/10 p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
