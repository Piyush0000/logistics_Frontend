'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { DateField } from '@/components/ui/date-field';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import {
  DATE_ORDER_ERROR,
  DEBIT_TYPES,
  TRANSACTION_TYPES,
  WALLET_PATH,
  type TransactionType,
  type WalletFilters,
} from '@/lib/data/wallet/filters';

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
      className="motion-rise rounded-card border border-secondary bg-surface p-card"
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
            className={`${PRIMARY_BUTTON} flex-1 md:flex-none`}
          >
            Apply
          </button>
          <Link
            href={WALLET_PATH}
            className={`${SECONDARY_BUTTON} flex-1 hover:border-primary/40 hover:bg-muted md:flex-none`}
          >
            Clear
          </Link>
        </div>
      </Form>

      {error ? (
        <p
          role="alert"
          data-testid="filter-error"
          className="mt-4 rounded-control border border-error/30 bg-error/10 p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
