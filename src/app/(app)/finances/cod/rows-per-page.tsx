'use client';

import { useRouter } from 'next/navigation';
import {
  codHref,
  PAGE_SIZES,
  type CodFilters,
  type CodPageSize,
} from '@/lib/data/cod/filters';
import { SelectField } from '../wallet/select-field';

type PageSizeValue = (typeof PAGE_SIZES)[number]['value'];

export function RowsPerPage({ filters }: { filters: CodFilters }) {
  const router = useRouter();

  return (
    <div className="w-32">
      <SelectField
        label="Rows per page"
        name="perPage"
        value={String(filters.perPage) as PageSizeValue}
        options={PAGE_SIZES}
        // A different page size changes what each page holds, so start from the first.
        onChange={(value) =>
          router.push(codHref({ ...filters, perPage: Number(value) as CodPageSize }))
        }
      />
    </div>
  );
}
