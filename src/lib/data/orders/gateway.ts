import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { ShipmentListResponseSchema } from '../../gateway/schemas/orders';
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

export const gatewayOrdersService: OrdersService = {
  async listOrders(query: OrderListQuery) {
    return fetchOrdersList(query, await merchantCredential('shipments'));
  },

  async getOrderDetail(idOrAwb: string): Promise<DataResult<OrderDetail>> {
    // Backend gateway does not have a shipment detail route; fallback to mock with sample badge
    return mockOrdersService.getOrderDetail(idOrAwb);
  },

  async createShipment(input: CreateShipmentInput): Promise<DataResult<CreateShipmentResult>> {
    // Backend gateway unconditionally throws 503 on POST /api/v1/shipments
    // Fall back to mock store so users can test creation workflow seamlessly with Sample data badge
    return mockOrdersService.createShipment(input);
  },
};
