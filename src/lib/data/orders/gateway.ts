import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { CreateShipmentResponseSchema, ShipmentListResponseSchema } from '../../gateway/schemas/orders';
import { fromGateway, type DataResult } from '../source';
import { mockOrdersService } from './mock';
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  OrderDetail,
  OrderListQuery,
  OrderListResult,
  OrdersService,
} from './types';

export async function fetchOrdersList(
  query: OrderListQuery,
  token: string | null,
): Promise<DataResult<OrderListResult>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.carrier) params.set('carrier', query.carrier);
  if (query.from) params.set('from', query.from);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const qs = params.toString();
  const path = `/api/v1/shipments${qs ? `?${qs}` : ''}`;

  const result = await gatewayFetch(path, {
    schema: ShipmentListResponseSchema,
    token,
  });

  if (!result.ok) {
    return fromGateway(result);
  }

  // Filter client-side search if user passed search query
  let items = result.data.items;
  if (query.search) {
    const q = query.search.trim().toLowerCase();
    items = items.filter(
      (item) => item.awb.toLowerCase().includes(q) || item.reference_id.toLowerCase().includes(q),
    );
  }

  return fromGateway({
    ...result,
    data: {
      items,
      page: result.data.page,
      limit: result.data.limit,
      total: result.data.total,
    },
  });
}

/** Books a shipment. The gateway answers 202 with no AWB, so the result has none yet. */
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

  const { shipment_id, carrier, status } = result.data;
  return fromGateway({
    ...result,
    data: {
      shipment_id,
      carrier: carrier as CreateShipmentResult['carrier'],
      status: status as CreateShipmentResult['status'],
      awb: null,
      reference_id: input.reference_id ?? '',
      created_at: new Date().toISOString(),
    },
  });
}

export const gatewayOrdersService: OrdersService = {
  async listOrders(query: OrderListQuery) {
    return fetchOrdersList(query, await merchantCredential('shipments'));
  },

  async getOrderDetail(idOrAwb: string): Promise<DataResult<OrderDetail>> {
    // Backend gateway does not have a shipment detail route; fallback to mock with sample badge
    return mockOrdersService.getOrderDetail(idOrAwb);
  },

  async createShipment(input: CreateShipmentInput): Promise<DataResult<CreateShipmentResult>> {
    return postShipment(input, await merchantCredential('shipments'));
  },
};
