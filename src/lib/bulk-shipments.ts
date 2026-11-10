import { StandardShipmentRequestSchema, type StandardShipmentRequestInput } from '@logicore/contracts';
import type { ZodIssue } from 'zod';

/** The columns of the upload template, in order. A file must start with exactly this header. */
export const BULK_COLUMNS: readonly string[] = [
  'origin_name',
  'origin_phone',
  'origin_line1',
  'origin_city',
  'origin_state',
  'origin_pincode',
  'destination_name',
  'destination_phone',
  'destination_line1',
  'destination_line2',
  'destination_city',
  'destination_state',
  'destination_pincode',
  'weight_kg',
  'length_cm',
  'width_cm',
  'height_cm',
  'item_name',
  'item_quantity',
  'item_unit_price',
  'payment_type',
  'cod_amount',
  'reference_id',
  'preferred_carrier',
];

export const MAX_BULK_ROWS = 200;
/** The largest file the screen accepts. */
export const MAX_BULK_FILE_BYTES = 1024 * 1024;

export const BULK_COLUMNS_MESSAGE = "The file's columns don't match the template.";
export const BULK_TOO_MANY_MESSAGE = `Upload at most ${MAX_BULK_ROWS} rows at a time.`;

export interface BulkRow {
  /** The row's position in the file, counting the header as line 1. */
  line: number;
  input: StandardShipmentRequestInput | null;
  errors: string[];
}

export interface BulkParseResult {
  rows: BulkRow[];
  fatal: string | null;
}

/** Splits CSV text into records of cells. Handles quotes, doubled quotes and CRLF or LF. */
function splitCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  let touched = false;

  const endCell = () => {
    record.push(cell);
    cell = '';
  };
  const endRecord = () => {
    endCell();
    records.push(record);
    record = [];
    touched = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    touched = true;
    if (char === '"' && cell === '') quoted = true;
    else if (char === ',') endCell();
    else if (char === '\n') endRecord();
    else if (char === '\r') {
      if (text[i + 1] === '\n') i += 1;
      endRecord();
    } else cell += char;
  }
  if (touched || cell !== '' || record.length > 0) endRecord();
  return records;
}

const NUMBER = /^-?\d+(\.\d+)?$/;

function text(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}

/** A number, or undefined when blank, or NaN when the text is not a plain number. */
function numeric(value: string | undefined): number | undefined {
  const trimmed = text(value);
  if (trimmed === undefined) return undefined;
  return NUMBER.test(trimmed) ? Number(trimmed) : Number.NaN;
}

function toRequest(cells: Record<string, string>, key: string): unknown {
  const paymentType = text(cells.payment_type)?.toUpperCase();
  return {
    idempotency_key: key,
    reference_id: text(cells.reference_id),
    origin: {
      name: text(cells.origin_name),
      phone: text(cells.origin_phone),
      line1: text(cells.origin_line1),
      city: text(cells.origin_city),
      state: text(cells.origin_state),
      country: 'IN',
      pincode: text(cells.origin_pincode),
    },
    destination: {
      name: text(cells.destination_name),
      phone: text(cells.destination_phone),
      line1: text(cells.destination_line1),
      line2: text(cells.destination_line2),
      city: text(cells.destination_city),
      state: text(cells.destination_state),
      country: 'IN',
      pincode: text(cells.destination_pincode),
    },
    weight_kg: numeric(cells.weight_kg),
    dimensions: {
      length_cm: numeric(cells.length_cm),
      width_cm: numeric(cells.width_cm),
      height_cm: numeric(cells.height_cm),
    },
    items: [
      {
        name: text(cells.item_name),
        quantity: numeric(cells.item_quantity),
        unit_price: numeric(cells.item_unit_price),
      },
    ],
    payment_type: paymentType,
    cod_amount: numeric(cells.cod_amount),
    preferred_carrier: text(cells.preferred_carrier)?.toLowerCase(),
  };
}

/** The template column an issue belongs to, for example `destination_pincode`. */
function columnFor(path: ReadonlyArray<string | number>): string {
  const [first, second, third] = path;
  if (first === 'origin' || first === 'destination') return `${first}_${String(second)}`;
  if (first === 'dimensions') return String(second);
  if (first === 'items') return `item_${String(third)}`;
  return String(first);
}

/** Turns one schema issue into a short sentence about a column, for example "weight kg is required". */
function describeIssue(line: number, issue: ZodIssue): string {
  const column = columnFor(issue.path);
  const label = column.replaceAll('_', ' ');
  if (issue.code === 'custom') {
    return column.endsWith('pincode')
      ? `Line ${line}: ${label} is invalid`
      : `Line ${line}: ${issue.message}`;
  }
  const missing =
    (issue.code === 'invalid_type' && issue.received === 'undefined') ||
    (issue.code === 'too_small' && issue.type === 'string' && issue.minimum === 1);
  return `Line ${line}: ${label} ${missing ? 'is required' : 'is invalid'}`;
}

/**
 * Reads the upload template. `fileKey` identifies the file's contents (the caller hashes the
 * text), and each row's idempotency key is `bulk-<fileKey>-<line>`, so sending the same file
 * twice cannot book a shipment twice.
 */
export function parseBulkCsv(raw: string, fileKey: string): BulkParseResult {
  const records = splitCsv(raw.replace(/^﻿/, ''));
  const header = (records[0] ?? []).map((cell) => cell.trim());
  if (header.length !== BULK_COLUMNS.length || header.some((cell, i) => cell !== BULK_COLUMNS[i])) {
    return { rows: [], fatal: BULK_COLUMNS_MESSAGE };
  }

  const dataRecords = records
    .map((cells, index) => ({ cells, line: index + 1 }))
    .slice(1)
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ''));
  if (dataRecords.length > MAX_BULK_ROWS) return { rows: [], fatal: BULK_TOO_MANY_MESSAGE };

  const rows = dataRecords.map(({ cells, line }): BulkRow => {
    if (cells.length > BULK_COLUMNS.length) {
      return { line, input: null, errors: [`Line ${line}: has more cells than the template.`] };
    }
    const byColumn = Object.fromEntries(BULK_COLUMNS.map((column, i) => [column, cells[i] ?? '']));
    const parsed = StandardShipmentRequestSchema.safeParse(
      toRequest(byColumn, `bulk-${fileKey}-${line}`),
    );
    if (parsed.success) return { line, input: parsed.data, errors: [] };
    const errors = [...new Set(parsed.error.issues.map((issue) => describeIssue(line, issue)))];
    return { line, input: null, errors };
  });

  return { rows, fatal: null };
}
