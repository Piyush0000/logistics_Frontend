'use server';

import { createHash } from 'node:crypto';
import { StandardShipmentRequestSchema } from '@logicore/contracts';
import { getDemoSession } from '@/lib/auth/session';
import {
  MAX_BULK_FILE_BYTES,
  MAX_BULK_ROWS,
  parseBulkCsv,
  type BulkParseResult,
} from '@/lib/bulk-shipments';
import { ordersService } from '@/lib/data/orders';
import { bookingErrorMessage } from '@/lib/data/orders/booking-message';

export type PreviewBulkResult =
  | ({ ok: true } & BulkParseResult)
  | { ok: false; message: string };

/**
 * Reads an uploaded file's text and returns its valid and invalid rows. The key that stops a
 * file booking twice comes from the file's contents and is worked out here, on the server.
 */
export async function previewBulkAction(text: string): Promise<PreviewBulkResult> {
  if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' };
  if (typeof text !== 'string') return { ok: false, message: 'Choose a .csv file.' };
  if (Buffer.byteLength(text) > MAX_BULK_FILE_BYTES) {
    return { ok: false, message: 'The file is larger than 1 MB.' };
  }
  const fileKey = createHash('sha256').update(text).digest('hex');
  return { ok: true, ...parseBulkCsv(text, fileKey) };
}

export interface BulkSubmitRow {
  line: number;
  /** Checked again here, because the browser could send anything. */
  input: unknown;
}

export interface BulkRowResult {
  line: number;
  ok: boolean;
  message: string;
  shipmentId: string | null;
}

export type SubmitBulkResult =
  | { ok: true; results: BulkRowResult[] }
  | { ok: false; message: string };

/** Books each row in order. A row that fails never stops the rows after it. */
export async function submitBulkAction(rows: BulkSubmitRow[]): Promise<SubmitBulkResult> {
  if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: 'There are no rows to submit.' };
  }
  if (rows.length > MAX_BULK_ROWS) {
    return { ok: false, message: `Upload at most ${MAX_BULK_ROWS} rows at a time.` };
  }

  const service = ordersService();
  const results: BulkRowResult[] = [];
  for (const row of rows) {
    const line = Number.isInteger(row?.line) ? row.line : 0;
    const parsed = StandardShipmentRequestSchema.safeParse(row?.input);
    if (!parsed.success) {
      results.push({
        line,
        ok: false,
        message: `Line ${line}: this row is not valid and was not booked.`,
        shipmentId: null,
      });
      continue;
    }
    // The gateway sets the merchant from the signed-in session, never from the request.
    const input = { ...parsed.data };
    delete input.merchant_id;

    const created = await service.createShipment(input);
    if (!created.ok) {
      results.push({ line, ok: false, message: bookingErrorMessage(created.error), shipmentId: null });
      continue;
    }
    results.push({
      line,
      ok: true,
      message: created.data.awb ? `AWB ${created.data.awb}` : 'AWB pending',
      shipmentId: created.data.shipment_id,
    });
  }
  return { ok: true, results };
}
