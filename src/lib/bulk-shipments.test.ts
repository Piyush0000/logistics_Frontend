import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BULK_COLUMNS, MAX_BULK_ROWS, parseBulkCsv } from './bulk-shipments';

const HEADER = BULK_COLUMNS.join(',');

/** One valid row, in BULK_COLUMNS order. */
const VALID = [
  'Central Hub', '9876543210', '42 Industrial Road', 'Bengaluru', 'Karnataka', '560100',
  'Aditi Rao', '9988776655', 'Flat 302 Green Glen', 'Bellandur', 'Bengaluru', 'Karnataka', '560103',
  '1.2', '25', '15', '10', 'Keyboard', '1', '3499', 'PREPAID', '0', 'ORD-1', 'delhivery',
];

function csv(...rows: string[][]): string {
  return [HEADER, ...rows.map((row) => row.join(','))].join('\r\n') + '\r\n';
}

function withCell(column: string, value: string): string[] {
  const row = [...VALID];
  row[BULK_COLUMNS.indexOf(column)] = value;
  return row;
}

describe('parseBulkCsv', () => {
  it('parses a valid template row into a shipment request', () => {
    const { rows, fatal } = parseBulkCsv(csv(VALID), 'abc12345');
    expect(fatal).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.line).toBe(2);
    expect(rows[0]?.input).toMatchObject({
      idempotency_key: 'bulk-abc12345-2',
      reference_id: 'ORD-1',
      origin: { name: 'Central Hub', pincode: '560100', country: 'IN' },
      destination: { name: 'Aditi Rao', line2: 'Bellandur', pincode: '560103' },
      weight_kg: 1.2,
      dimensions: { length_cm: 25, width_cm: 15, height_cm: 10 },
      items: [{ name: 'Keyboard', quantity: 1, unit_price: 3499 }],
      payment_type: 'PREPAID',
      cod_amount: 0,
      preferred_carrier: 'delhivery',
    });
  });

  it('reports each invalid field with its line number', () => {
    const { rows } = parseBulkCsv(csv(VALID, withCell('destination_pincode', '012345')), 'k');
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[1]?.input).toBeNull();
    expect(rows[1]?.errors).toEqual(['Line 3: destination pincode is invalid']);

    const blank = parseBulkCsv(csv(withCell('weight_kg', ''), withCell('payment_type', 'CASH')), 'k');
    expect(blank.rows[0]?.errors).toEqual(['Line 2: weight kg is required']);
    expect(blank.rows[1]?.errors).toEqual(['Line 3: payment type is invalid']);
  });

  it('requires an amount for cash on delivery rows', () => {
    const { rows } = parseBulkCsv(csv(withCell('payment_type', 'COD')), 'k');
    expect(rows[0]?.input).toBeNull();
    expect(rows[0]?.errors).toHaveLength(1);
    expect(rows[0]?.errors[0]).toMatch(/^Line 2: .*cod_amount/);
    const ok = parseBulkCsv(
      csv(withCell('payment_type', 'COD').map((c, i) => (i === BULK_COLUMNS.indexOf('cod_amount') ? '999' : c))),
      'k',
    );
    expect(ok.rows[0]?.errors).toEqual([]);
    expect(ok.rows[0]?.input?.cod_amount).toBe(999);
  });

  it('rejects a file with wrong columns', () => {
    const message = "The file's columns don't match the template.";
    expect(parseBulkCsv('name,phone\r\nA,1\r\n', 'k')).toEqual({ rows: [], fatal: message });
    expect(parseBulkCsv(`${BULK_COLUMNS.slice().reverse().join(',')}\r\n`, 'k').fatal).toBe(message);
    expect(parseBulkCsv('', 'k').fatal).toBe(message);
  });

  it('rejects more than 200 rows', () => {
    const rows = Array.from({ length: MAX_BULK_ROWS + 1 }, () => VALID);
    expect(parseBulkCsv(csv(...rows), 'k')).toEqual({
      rows: [],
      fatal: 'Upload at most 200 rows at a time.',
    });
    expect(parseBulkCsv(csv(...rows.slice(1)), 'k').fatal).toBeNull();
  });

  it('gives the same keys for the same file', () => {
    const text = csv(VALID, withCell('reference_id', 'ORD-2'));
    const first = parseBulkCsv(text, 'same-file');
    const second = parseBulkCsv(text, 'same-file');
    expect(first.rows.map((r) => r.input?.idempotency_key)).toEqual([
      'bulk-same-file-2',
      'bulk-same-file-3',
    ]);
    expect(second).toEqual(first);
    const other = parseBulkCsv(text, 'other-file');
    expect(other.rows[0]?.input?.idempotency_key).toBe('bulk-other-file-2');
  });

  it('handles quotes, commas, blank lines, a byte-order mark and plain line feeds', () => {
    const quoted = withCell('origin_line1', '"Unit 4, ""Annex"" Road"');
    const text = `\uFEFF${HEADER}\n${quoted.join(',')}\n\n`;
    const { rows, fatal } = parseBulkCsv(text, 'k');
    expect(fatal).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.input?.origin.line1).toBe('Unit 4, "Annex" Road');
  });

  it('flags a row with too many cells', () => {
    const { rows } = parseBulkCsv(csv([...VALID, 'extra']), 'k');
    expect(rows[0]?.errors).toEqual(['Line 2: has more cells than the template.']);
  });

  it('keeps the template file in step with the parser, with no sample row', () => {
    const template = readFileSync(
      join(process.cwd(), 'public/samples/bulk-shipments-template.csv'),
      'utf8',
    );
    // Only the column names: a sample row could be uploaded unchanged and book a real shipment.
    const lines = template.split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual([HEADER]);
    // The parser still reads the template's header once a row is added.
    const filled = `${template}${HEADER.split(',').map(() => 'x').join(',')}`;
    expect(parseBulkCsv(filled, 'k').fatal).toBeNull();
  });
});
