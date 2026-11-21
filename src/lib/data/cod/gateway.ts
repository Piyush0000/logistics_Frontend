import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway, type DataResult } from '../source';
import type { CodFilters } from './filters';
import type { CodRemittance, CodService } from './types';

const lineSchema = z.object({
  id: z.string(),
  awb: z.string(),
  carrier: z.string(),
  expected_paise: z.number(),
  settled_paise: z.number().nullable(),
  settled_at: z.string().nullable(),
  delivered_at: z.string(),
  evoc_awb: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
});
const pageSchema = z.object({
  items: z.array(lineSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
const summarySchema = z.object({
  remitted_till_date_paise: z.number(),
  settled_count: z.number(),
  last_remittance_paise: z.number(),
  next_batch_paise: z.number(),
  next_batch_count: z.number(),
  total_due_paise: z.number(),
  due_count: z.number(),
});

/** Shipping is paid from the wallet, so nothing is deducted from COD: the full amount is paid out. */
function toRemittance(line: z.infer<typeof lineSchema>): CodRemittance {
  const settled = line.settled_at !== null;
  const paid = settled ? (line.settled_paise ?? 0) : line.expected_paise;
  return {
    id: line.id,
    orderNumber: line.reference_id || line.evoc_awb || line.awb,
    awb: line.evoc_awb ?? line.awb,
    courier: line.carrier,
    codPaise: line.expected_paise,
    // A short courier payment is the only deduction: what it paid less than the order's COD.
    deductionsPaise: line.expected_paise - paid,
    remittablePaise: paid,
    status: settled ? 'settled' : 'pending',
    collectedAt: line.delivered_at,
    settledAt: line.settled_at,
  };
}

async function fetchPage(filters: CodFilters, page: number, limit: number) {
  return gatewayFetch('/api/v1/cod/remittances', {
    schema: pageSchema,
    token: await merchantCredential('shipments'),
    query: {
      status: filters.status === 'all' ? undefined : filters.status,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page,
      limit,
    },
  });
}

const EXPORT_PAGE = 100;
const EXPORT_MAX_ROWS = 10_000;

/** COD per delivered order from GET /api/v1/cod/*: pending until the courier's batch is reconciled. */
export const gatewayCodService: CodService = {
  async getSummary() {
    const result = await gatewayFetch('/api/v1/cod/summary', {
      schema: summarySchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              remittedTillDatePaise: result.data.remitted_till_date_paise,
              settledCount: result.data.settled_count,
              lastRemittancePaise: result.data.last_remittance_paise,
              nextBatchPaise: result.data.next_batch_paise,
              nextBatchCount: result.data.next_batch_count,
              totalDuePaise: result.data.total_due_paise,
              dueCount: result.data.due_count,
            },
          }
        : result,
    );
  },

  async listRemittances(filters) {
    const result = await fetchPage(filters, filters.page, filters.perPage);
    if (!result.ok) return fromGateway(result);
    const { items, total, limit } = result.data;
    const pageCount = Math.max(1, Math.ceil(total / limit));
    const start = (result.data.page - 1) * limit;
    return {
      ok: true,
      source: 'gateway',
      data: {
        entries: items.map(toRemittance),
        page: result.data.page,
        pageCount,
        first: items.length ? start + 1 : 0,
        last: start + items.length,
        total,
      },
    };
  },

  async exportRemittances(filters): Promise<DataResult<CodRemittance[]>> {
    const rows: CodRemittance[] = [];
    for (let page = 1; rows.length < EXPORT_MAX_ROWS; page += 1) {
      const result = await fetchPage(filters, page, EXPORT_PAGE);
      if (!result.ok) return fromGateway(result);
      rows.push(...result.data.items.map(toRemittance));
      if (page * EXPORT_PAGE >= result.data.total || result.data.items.length === 0) break;
    }
    return { ok: true, source: 'gateway', data: rows };
  },
};
