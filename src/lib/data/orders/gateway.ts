import 'server-only';

import type { Address, Dimensions, PaymentType, ShipmentItem } from '@logicore/contracts';
import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { CreateShipmentResponseSchema, OrdersPageSchema } from '../../gateway/schemas/orders';
import { fromGateway, type DataResult } from '../source';
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  OrderDetail,
  OrderListQuery,
  OrderListResult,
  OrdersService,
  TimelineEvent,
} from './types';

export async function fetchOrdersList(
  query: OrderListQuery,
  token: string | null,
): Promise<DataResult<OrderListResult>> {
  const result = await gatewayFetch('/api/v1/shipments', {
    schema: OrdersPageSchema,
    token,
    query: {
      status: query.status,
      carrier: query.carrier,
      from: query.from,
      // Searched on the server across every page: Evoc AWB or the merchant's own reference.
      q: query.search?.trim() || undefined,
      page: query.page,
      limit: query.limit,
    },
  });
  if (!result.ok) return fromGateway(result);
  const { items, page, limit, total } = result.data;
  return fromGateway({ ...result, data: { items, page, limit, total } });
}

/** Books a shipment. The gateway answers 202 with the Evoc AWB already assigned. */
export async function postShipment(
  input: CreateShipmentInput,
  token: string | null,
): Promise<DataResult<CreateShipmentResult>> {
  // The gateway takes the merchant from the credential, so the body never carries merchant_id.
  const body: Record<string, unknown> = { ...input };
  delete body.merchant_id;

  const result = await gatewayFetch('/api/v1/shipments', {
    method: 'POST',
    body,
    schema: CreateShipmentResponseSchema,
    token,
  });
  if (!result.ok) return fromGateway(result);

  const { shipment_id, carrier, status, awb } = result.data;
  return fromGateway({
    ...result,
    data: {
      shipment_id,
      carrier: carrier as CreateShipmentResult['carrier'],
      status: status as CreateShipmentResult['status'],
      awb: awb ?? null,
      reference_id: input.reference_id ?? '',
      created_at: new Date().toISOString(),
    },
  });
}

/** GET /api/v1/shipments/:ref for the merchant who booked it: list fields plus what they sent. */
const DetailSchema = z.object({
  id: z.string(),
  awb: z.string(),
  reference_id: z.string().nullish(),
  status: z.string(),
  carrier: z.string(),
  payment_type: z.string(),
  created_at: z.string(),
  last_status_at: z.string(),
  stuck: z.boolean(),
  origin: z.record(z.unknown()).nullable(),
  destination: z.record(z.unknown()).nullable(),
  weight_kg: z.number(),
  dimensions: z.record(z.unknown()).nullable(),
  items: z.array(z.record(z.unknown())),
  cod_amount: z.number(),
});

const TimelineSchema = z.object({
  timeline: z.array(
    z.object({ status: z.string(), location: z.string().nullable(), occurred_at: z.string() }),
  ),
});

const NO_DIMENSIONS = { length_cm: 0, breadth_cm: 0, height_cm: 0 } as unknown as Dimensions;

function describe(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function fetchOrderDetail(
  ref: string,
  token: string | null,
): Promise<DataResult<OrderDetail>> {
  const path = `/api/v1/shipments/${encodeURIComponent(ref)}`;
  const [detail, tracking] = await Promise.all([
    gatewayFetch(path, { schema: DetailSchema, token }),
    gatewayFetch(`${path}/tracking`, { schema: TimelineSchema, token }),
  ]);
  if (!detail.ok) return fromGateway(detail);
  const d = detail.data;
  const items = d.items as unknown as ShipmentItem[];
  const timeline: TimelineEvent[] = (tracking.ok ? tracking.data.timeline : [])
    .map((event) => ({
      status: event.status,
      location: event.location,
      timestamp: event.occurred_at,
      description: describe(event.status),
    }))
    .reverse();
  return {
    ok: true,
    source: 'gateway',
    data: {
      shipment_id: d.id,
      reference_id: d.reference_id ?? '',
      carrier: d.carrier,
      awb: d.awb,
      status: d.status,
      created_at: d.created_at,
      last_status_at: d.last_status_at,
      stuck: d.stuck,
      origin: (d.origin ?? {}) as unknown as Address,
      destination: (d.destination ?? {}) as unknown as Address,
      weight_kg: d.weight_kg,
      dimensions: (d.dimensions as unknown as Dimensions) ?? NO_DIMENSIONS,
      items,
      payment_type: d.payment_type as PaymentType,
      cod_amount: d.cod_amount,
      total_amount_paise: items.reduce(
        (sum, item) => sum + Math.round((item.unit_price ?? 0) * 100) * (item.quantity ?? 1),
        0,
      ),
      timeline,
    },
  };
}

export const gatewayOrdersService: OrdersService = {
  async listOrders(query: OrderListQuery) {
    return fetchOrdersList(query, await merchantCredential('shipments'));
  },

  async getOrderDetail(idOrAwb: string) {
    return fetchOrderDetail(idOrAwb, await merchantCredential('shipments'));
  },

  async createShipment(input: CreateShipmentInput) {
    return postShipment(input, await merchantCredential('shipments'));
  },
};
