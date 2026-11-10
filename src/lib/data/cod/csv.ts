import { csvRupees as rupees, toCsv } from '../../csv';
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

export function remittancesToCsv(rows: CodRemittance[], source: DataSource): string {
  return toCsv(
    HEADER,
    rows.map((row) => [
      row.orderNumber,
      row.awb,
      row.courier,
      rupees(row.codPaise),
      rupees(row.deductionsPaise),
      rupees(row.remittablePaise),
      STATUS_LABELS[row.status],
      formatDate(row.collectedAt),
      row.settledAt ? formatDate(row.settledAt) : '',
    ]),
    source === 'mock' ? SAMPLE_CSV_NOTICE : undefined,
  );
}
