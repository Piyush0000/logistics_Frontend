import { formatDate } from '../../format/date';
import type { DataSource } from '../source';
import type { CodRemittance } from './types';

export const SAMPLE_CSV_NOTICE = 'Sample data: these are not real remittances';

const HEADER = [
  'Order Number',
  'AWB',
  'Courier',
  'COD Amount',
  'Deductions',
  'Remittable',
  'Status',
  'Collected',
  'Settled At',
];

const STATUS_LABELS = { pending: 'Pending', settled: 'Settled' };

/** Rupees to two places, worked out in whole numbers so nothing is rounded. */
const rupees = (paise: number) =>
  `${Math.trunc(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;

function cell(value: string): string {
  // Spreadsheets run cells starting with these as formulas, so a leading quote keeps them as text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function remittancesToCsv(rows: CodRemittance[], source: DataSource): string {
  const lines = [
    ...(source === 'mock' ? [SAMPLE_CSV_NOTICE] : []),
    HEADER.join(','),
    ...rows.map((row) =>
      [
        row.orderNumber,
        row.awb,
        row.courier,
        rupees(row.codPaise),
        rupees(row.deductionsPaise),
        rupees(row.remittablePaise),
        STATUS_LABELS[row.status],
        formatDate(row.collectedAt),
        row.settledAt ? formatDate(row.settledAt) : '',
      ]
        .map(cell)
        .join(','),
    ),
  ];
  return `${lines.join('\r\n')}\r\n`;
}
