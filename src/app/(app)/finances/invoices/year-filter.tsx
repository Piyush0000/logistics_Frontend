'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useState } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
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
      className="motion-rise rounded-card border border-secondary bg-surface p-card"
    >
      <Form
        action={path}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end"
      >
        <SelectField label="Year" name="year" value={value} options={options} onChange={setValue} />
        <div className="flex gap-3">
          <button
            type="submit"
            className={`${PRIMARY_BUTTON} flex-1 sm:flex-none`}
          >
            Apply
          </button>
          <Link
            href={path}
            className={`${SECONDARY_BUTTON} flex-1 hover:border-primary/40 hover:bg-muted sm:flex-none`}
          >
            Clear
          </Link>
        </div>
      </Form>
    </section>
  );
}
