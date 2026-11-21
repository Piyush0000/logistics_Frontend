import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway, type DataResult } from '../source';
import type { NdrDashboardData, NdrRecord, NdrService, NdrStatus } from './types';

export const ndrCaseSchema = z.object({
  id: z.string(),
  shipment_id: z.string(),
  awb: z.string(),
  carrier: z.string(),
  status: z.enum(['ACTION_REQUIRED', 'REATTEMPT_REQUESTED', 'RTO_REQUESTED', 'DELIVERED', 'RETURNED']),
  attempt_count: z.number(),
  last_reason: z.string(),
  last_attempt_at: z.string(),
  action_error: z.string().nullable(),
  history: z.array(z.object({ kind: z.string(), note: z.string().nullable(), at: z.string() })),
  evoc_awb: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
  recipient_name: z.string().optional(),
  recipient_phone: z.string().optional(),
  destination_city: z.string().optional(),
});
type NdrCase = z.infer<typeof ndrCaseSchema>;

const HISTORY_LABEL: Record<string, string> = {
  ATTEMPT_FAILED: 'Delivery attempt failed',
  REATTEMPT_REQUESTED: 'Re-attempt requested',
  RTO_REQUESTED: 'Return to origin requested',
  CARRIER_ACCEPTED: 'Courier accepted the request',
  CARRIER_REFUSED: 'Courier refused the request',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned to origin',
};

/** A returned shipment shows as RTO; the dashboard still counts it as returned. */
function toRecord(c: NdrCase): NdrRecord {
  const status: NdrStatus = c.status === 'RETURNED' ? 'RTO_REQUESTED' : c.status;
  return {
    id: c.id,
    shipment_id: c.shipment_id,
    awb: c.evoc_awb ?? c.awb,
    reference_id: c.reference_id ?? '',
    carrier: c.carrier,
    recipient_name: c.recipient_name ?? '',
    recipient_phone: c.recipient_phone ?? '',
    destination_city: c.destination_city ?? '',
    attempt_count: c.attempt_count,
    last_attempt_at: c.last_attempt_at,
    // A refused decision is what the merchant must see first.
    reason: c.action_error ? `${c.last_reason}. Your last request was refused: ${c.action_error}` : c.last_reason,
    raw_status: c.awb,
    status,
    history: c.history.map((h) => ({
      action: HISTORY_LABEL[h.kind] ?? h.kind,
      timestamp: h.at,
      ...(h.note ? { note: h.note } : {}),
    })),
  };
}

function dashboard(cases: NdrCase[]): NdrDashboardData {
  const count = (...statuses: NdrCase['status'][]) => cases.filter((c) => statuses.includes(c.status)).length;
  return {
    kpis: {
      openNdr: count('ACTION_REQUIRED'),
      reattempted: count('REATTEMPT_REQUESTED'),
      delivered: count('DELIVERED'),
      returned: count('RTO_REQUESTED', 'RETURNED'),
    },
    items: cases.map(toRecord),
  };
}

/** Failed deliveries from GET /api/v1/ndr; decisions go to POST /api/v1/ndr/:id/action. */
export const gatewayNdrService: NdrService = {
  async getNdrDashboard() {
    const result = await gatewayFetch('/api/v1/ndr', {
      schema: z.object({ items: z.array(ndrCaseSchema) }),
      token: await merchantCredential('shipments'),
      timeoutMs: 10_000,
    });
    return fromGateway(result.ok ? { ...result, data: dashboard(result.data.items) } : result);
  },

  async takeNdrAction(input): Promise<DataResult<NdrRecord>> {
    const result = await gatewayFetch(`/api/v1/ndr/${encodeURIComponent(input.ndr_id)}/action`, {
      method: 'POST',
      schema: ndrCaseSchema,
      token: await merchantCredential('shipments'),
      body: {
        action: input.action,
        ...(input.action === 'REATTEMPT' && input.preferred_date ? { preferred_date: input.preferred_date } : {}),
        ...(input.instructions?.trim() ? { instructions: input.instructions.trim().slice(0, 200) } : {}),
      },
    });
    return fromGateway(result.ok ? { ...result, data: toRecord(result.data) } : result);
  },
};
