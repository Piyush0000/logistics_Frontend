import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../gateway/client';
import { notAvailable } from '../../data/not-available';
import { resolveDataSource, type DataResult } from '../../data/source';
import { adminToken, mapResult } from './admin-fetch';
import type { WeightLine } from './weight-rules';

export const ADMIN_WEIGHT_STATUSES = ['disputed', 'open', 'accepted', 'resolved'] as const;
export type AdminWeightStatus = (typeof ADMIN_WEIGHT_STATUSES)[number];
export const ADMIN_WEIGHT_PAGE_SIZE = 20;

export interface AdminDiscrepancy {
  id: string;
  merchantId: string;
  merchantName: string;
  awb: string;
  carrierAwb: string;
  carrier: string;
  declaredGrams: number;
  chargedGrams: number;
  extraChargePaise: number;
  status: AdminWeightStatus;
  outcome: 'merchant_charged' | 'merchant_cleared' | null;
  disputeNote: string | null;
  evidence: { name: string; type: string; size: number }[];
  resolutionNote: string | null;
  chargedPaise: number;
  raisedAt: string;
  respondBy: string;
}

export interface RecordResult {
  created: number;
  duplicates: number;
  notHeavier: number;
  unknownCount: number;
  unknown: string[];
}

const RowSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  awb: z.string(),
  carrier_awb: z.string(),
  carrier: z.string(),
  declared_grams: z.number().int(),
  charged_grams: z.number().int(),
  extra_charge_paise: z.number().int(),
  status: z.enum(ADMIN_WEIGHT_STATUSES),
  outcome: z.enum(['merchant_charged', 'merchant_cleared']).nullable(),
  dispute_note: z.string().nullable(),
  evidence: z.array(z.object({ name: z.string(), type: z.string(), size: z.number() })),
  resolution_note: z.string().nullable(),
  charged_paise: z.number().int(),
  raised_at: z.string(),
  respond_by: z.string(),
});

const toDiscrepancy = (r: z.infer<typeof RowSchema>): AdminDiscrepancy => ({
  id: r.id,
  merchantId: r.merchant_id,
  merchantName: r.merchant_name,
  awb: r.awb,
  carrierAwb: r.carrier_awb,
  carrier: r.carrier,
  declaredGrams: r.declared_grams,
  chargedGrams: r.charged_grams,
  extraChargePaise: r.extra_charge_paise,
  status: r.status,
  outcome: r.outcome,
  disputeNote: r.dispute_note,
  evidence: r.evidence,
  resolutionNote: r.resolution_note,
  chargedPaise: r.charged_paise,
  raisedAt: r.raised_at,
  respondBy: r.respond_by,
});

export interface AdminWeightService {
  list(query: { status: AdminWeightStatus; q?: string; page: number }): Promise<
    DataResult<{ items: AdminDiscrepancy[]; page: number; pageCount: number; total: number }>
  >;
  record(carrier: string, lines: WeightLine[]): Promise<DataResult<RecordResult>>;
  resolve(id: string, decision: 'courier' | 'merchant', note: string): Promise<DataResult<{ id: string }>>;
}

const gatewayAdminWeightService: AdminWeightService = {
  async list({ status, q, page }) {
    const result = await gatewayFetch('/api/v1/admin/weight/discrepancies', {
      schema: z.object({
        items: z.array(RowSchema),
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
      }),
      token: adminToken(),
      query: { status, q: q || undefined, page, limit: ADMIN_WEIGHT_PAGE_SIZE },
    });
    return mapResult(result, (r) => ({
      items: r.items.map(toDiscrepancy),
      page: r.page,
      pageCount: Math.max(1, Math.ceil(r.total / r.limit)),
      total: r.total,
    }));
  },

  async record(carrier, lines) {
    const result = await gatewayFetch('/api/v1/admin/weight/records', {
      method: 'POST',
      schema: z.object({
        created: z.number(),
        duplicates: z.number(),
        not_heavier: z.number(),
        unknown_count: z.number(),
        unknown: z.array(z.string()),
      }),
      token: adminToken(),
      timeoutMs: 30_000,
      body: {
        carrier,
        lines: lines.map((l) => ({
          awb: l.awb,
          charged_grams: l.chargedGrams,
          extra_charge_paise: l.extraChargePaise,
        })),
      },
    });
    return mapResult(result, (r) => ({
      created: r.created,
      duplicates: r.duplicates,
      notHeavier: r.not_heavier,
      unknownCount: r.unknown_count,
      unknown: r.unknown,
    }));
  },

  async resolve(id, decision, note) {
    const result = await gatewayFetch(`/api/v1/admin/weight/discrepancies/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      schema: z.object({ id: z.string() }),
      token: adminToken(),
      body: { decision, note },
    });
    return mapResult(result, (r) => ({ id: r.id }));
  },
};

/** Weight disputes have no sample data: off the gateway, the screen says it isn't connected. */
const unavailableAdminWeightService: AdminWeightService = {
  list: notAvailable,
  record: notAvailable,
  resolve: notAvailable,
};

export function adminWeightService(): AdminWeightService {
  return resolveDataSource('admin_money') === 'gateway' ? gatewayAdminWeightService : unavailableAdminWeightService;
}
