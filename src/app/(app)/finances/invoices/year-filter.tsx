'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState } from 'react';
import { SelectField } from '@/components/ui/select-field';

/** A year picker that submits to the same page, so the year lives in the URL. */
export function YearFilter({
  years,
  year,
  path,
}: {
  years: readonly number[];
  year: number | undefined;
  path: string;
}) {
  const [value, setValue] = useState(year ? String(year) : 'all');
  const options = [
    { value: 'all', label: 'All years' },
    ...years.map((entry) => ({ value: String(entry), label: String(entry) })),
  ];

  return (
    <section
      aria-label="Filter invoices"
      className="rounded-card border border-secondary bg-surface p-card"
    >
      <Form
        action={path}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end"
      >
        <SelectField label="Year" name="year" value={value} options={options} onChange={setValue} />
        <div className="flex gap-3">
          <button
            type="submit"
            className="h-control flex-1 rounded-control bg-primary px-6 text-sm font-medium text-tertiary sm:flex-none"
          >
            Apply
          </button>
          <Link
            href={path}
            className="inline-flex h-control flex-1 items-center justify-center rounded-control border border-secondary px-4 text-sm font-medium sm:flex-none"
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}
