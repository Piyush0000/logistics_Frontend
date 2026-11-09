'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  DATE_ORDER_ERROR,
  DEBIT_TYPES,
  TRANSACTION_TYPES,
  WALLET_PATH,
  type TransactionType,
  type WalletFilters,
} from '@/lib/data/wallet/filters';
import { DateField } from './date-field';
import { SelectField } from './select-field';

const DEBIT_OPTIONS = [{ value: 'all', label: 'All Debit Types' }, ...DEBIT_TYPES] as const;

export function TransactionFilters({
  filters,
  error: urlError,
}: {
  filters: WalletFilters;
  error: string | null;
}) {
  const [type, setType] = useState(filters.type);
  const [debitType, setDebitType] = useState(filters.debitType);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [error, setError] = useState(urlError);

  function changeType(next: TransactionType) {
    setType(next);
    if (next === 'credit') setDebitType('all');
  }

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
      aria-label="Filter transactions"
      className="rounded-card border border-secondary bg-surface p-card"
    >
      <Form
        action={WALLET_PATH}
        onSubmit={handleSubmit}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <SelectField
          label="Transaction Type"
          name="type"
          value={type}
          options={TRANSACTION_TYPES}
          onChange={changeType}
        />
        <SelectField
          label="Debit Type"
          name="debitType"
          value={debitType}
          options={DEBIT_OPTIONS}
          disabled={type === 'credit'}
          onChange={setDebitType}
        />
        <DateField label="From Date" name="from" value={from} onChange={changeDate(setFrom)} />
        <DateField label="To Date" name="to" value={to} onChange={changeDate(setTo)} />

        <div className="flex gap-3 md:col-span-2 md:justify-end xl:col-span-1 xl:col-start-4 xl:row-span-2 xl:row-start-1 xl:self-center">
          <button
            type="submit"
            className="h-control flex-1 rounded-control bg-primary px-6 text-sm font-medium text-tertiary md:flex-none"
          >
            Apply
          </button>
          <Link
            href={WALLET_PATH}
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
