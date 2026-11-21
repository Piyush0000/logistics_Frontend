import 'server-only';

import { z } from 'zod';
import { ndrCaseSchema } from '../../../data/ndr/gateway';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, gatewayError, mapResult } from '../admin-fetch';
import { ADMIN_PAGE_SIZE, paginate } from '../common';
import type {
  AdminNdrShipment,
  AdminRtoShipment,
  AdminShipment,
  AdminShipmentDetail,
  AdminShipmentsService,
} from './types';

const rowSchema = z.object({
  awb: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  carrier: z.string(),
  status: z.string(),
  failure_reason: z.string().nullish(),
  created_at: z.string(),
  last_event_at: z.string(),
  stuck: z.boolean(),
});

const listSchema = z.object({
  items: z.array(rowSchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});

const addressSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  })
  .nullable();

const detailSchema = rowSchema.extend({
  origin_pin: z.string(),
  dest_pin: z.string(),
  weight_grams: z.number(),
  payment_type: z.string(),
  cod_amount_paise: z.number().nullable(),
  origin: addressSchema,
  destination: addressSchema,
  timeline: z.array(
    z.object({
      status: z.string(),
      raw_status: z.string().nullable().optional(),
      location: z.string().nullable(),
      occurred_at: z.string(),
    }),
  ),
});

function toShipment(s: z.infer<typeof rowSchema>): AdminShipment {
  return {
    awb: s.awb,
    merchantId: s.merchant_id,
    merchantName: s.merchant_name,
    carrier: s.carrier,
    status: s.status,
    createdAt: s.created_at,
    lastEventAt: s.last_event_at,
    stuck: s.stuck,
  };
}

function place(address: z.infer<typeof addressSchema>, pin: string): string {
  return [address?.city, address?.state, address?.pincode ?? pin].filter(Boolean).join(', ');
}

function toDetail(s: z.infer<typeof detailSchema>): AdminShipmentDetail {
  return {
    ...toShipment(s),
    origin: place(s.origin, s.origin_pin),
    destination: place(s.destination, s.dest_pin),
    recipientName: s.destination?.name ?? '',
    recipientPhone: s.destination?.phone ?? '',
    weightGrams: s.weight_grams,
    codAmountPaise: s.payment_type === 'COD' ? (s.cod_amount_paise ?? 0) : undefined,
    timeline: s.timeline.map((e) => ({
      status: e.status,
      rawStatus: e.raw_status ?? undefined,
      location: e.location,
      occurredAt: e.occurred_at,
    })),
  };
}

const ACTION_REQUIRED: Record<string, string> = {
  ACTION_REQUIRED: 'Merchant to decide',
  REATTEMPT_REQUESTED: 'Re-attempt requested',
  RTO_REQUESTED: 'Return requested',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
};

const adminNdrSchema = z.object({
  items: z.array(
    ndrCaseSchema.extend({ merchant_id: z.string().nullable(), merchant_name: z.string().nullable() }),
  ),
});

function list(query: Record<string, string | number | boolean | undefined>) {
  return gatewayFetch('/api/v1/admin/shipments', {
    schema: listSchema,
    token: adminToken(),
    query,
  });
}

export const gatewayAdminShipmentsService: AdminShipmentsService = {
  async listShipments({ q, status, merchantId, stuck, page = 1, pageSize = ADMIN_PAGE_SIZE }) {
    const result = await list({
      q: q?.trim() || undefined,
      status,
      merchant_id: merchantId,
      stuck: stuck ? 'true' : undefined,
      page,
      limit: pageSize,
    });
    return mapResult(result, (data) => ({
      items: data.items.map(toShipment),
      page: data.pagination.page,
      pageSize: data.pagination.limit,
      total: data.pagination.total,
    }));
  },

  async getShipment(awb) {
    const result = await gatewayFetch(`/api/v1/admin/shipments/${encodeURIComponent(awb)}`, {
      schema: detailSchema,
      token: adminToken(),
    });
    return mapResult(result, toDetail);
  },

  // Carriers' NDR (failed delivery attempt) events are not tracked as their own status yet.
  async listNdrShipments({ q, page = 1 } = {}) {
    const result = await gatewayFetch('/api/v1/admin/ndr', {
      schema: adminNdrSchema,
      token: adminToken(),
      timeoutMs: 10_000,
    });
    if (!result.ok) return gatewayError(result.error);
    const needle = q?.trim().toLowerCase();
    const rows: AdminNdrShipment[] = result.data.items
      .map((c) => ({
        awb: c.evoc_awb ?? c.awb,
        merchantId: c.merchant_id ?? '',
        merchantName: c.merchant_name ?? '—',
        carrier: c.carrier,
        status: c.status,
        createdAt: c.history[0]?.at ?? c.last_attempt_at,
        lastEventAt: c.last_attempt_at,
        stuck: false,
        ndrReason: c.action_error ? `${c.last_reason} (courier refused: ${c.action_error})` : c.last_reason,
        attemptsCount: c.attempt_count,
        lastAttemptAt: c.last_attempt_at,
        actionRequired: ACTION_REQUIRED[c.status] ?? c.status,
      }))
      .filter((row) => !needle || `${row.awb} ${row.merchantName}`.toLowerCase().includes(needle));
    return { ok: true, source: 'gateway', data: paginate(rows, page) };
  },

  /** Returns in progress and returned to origin, newest first. */
  async listRtoShipments({ q, page = 1 } = {}) {
    const [initiated, delivered] = await Promise.all(
      ['RTO_INITIATED', 'RTO_DELIVERED'].map((status) =>
        list({ status, q: q?.trim() || undefined, limit: 100 }),
      ),
    );
    if (!initiated!.ok) return gatewayError(initiated!.error);
    if (!delivered!.ok) return gatewayError(delivered!.error);
    const rows: AdminRtoShipment[] = [...initiated!.data.items, ...delivered!.data.items]
      .sort((a, b) => b.last_event_at.localeCompare(a.last_event_at))
      .map((s) => ({
        ...toShipment(s),
        rtoReason: s.failure_reason ?? '',
        rtoInitiatedAt: s.last_event_at,
        rtoDeliveredAt: s.status === 'RTO_DELIVERED' ? s.last_event_at : null,
      }));
    return { ok: true, source: 'gateway', data: paginate(rows, page) };
  },
};
