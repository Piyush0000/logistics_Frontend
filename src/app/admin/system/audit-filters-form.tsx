'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { DateField } from '@/components/ui/date-field';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { SelectField } from '@/components/ui/select-field';
import { AUDIT_PATH, type AuditFilters } from '@/lib/admin/data/system/audit-filters';

const DATE_ORDER_ERROR = 'From Date must be on or before To Date.';

export function AuditFiltersForm({
  filters,
  actions,
}: {
  filters: AuditFilters;
  actions: string[];
}) {
  const [action, setAction] = useState(filters.action);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [error, setError] = useState<string | null>(null);

  const options = [
    { value: '', label: 'All actions' },
    ...actions.map((value) => ({ value, label: value })),
  ];

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
    <div className="mb-4">
      <Form
        action={AUDIT_PATH}
        onSubmit={handleSubmit}
        aria-label="Filter the audit log"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <SelectField label="Action" name="action" value={action} options={options} onChange={setAction} />
        <DateField label="From Date" name="from" value={from} onChange={changeDate(setFrom)} />
        <DateField label="To Date" name="to" value={to} onChange={changeDate(setTo)} />
        <div className="flex gap-3 self-end md:justify-end">
          <button type="submit" className={`${PRIMARY_BUTTON} flex-1 md:flex-none`}>
            Apply
          </button>
          <Link href={AUDIT_PATH} className={`${SECONDARY_BUTTON} flex-1 md:flex-none`}>
            Clear
          </Link>
        </div>
      </Form>
      {error ? (
        <p
          role="alert"
          data-testid="filter-error"
          className="mt-3 rounded-control border border-error/30 bg-error/10 p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
