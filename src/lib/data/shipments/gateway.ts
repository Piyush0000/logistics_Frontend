import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { ShipmentStatsSchema } from '../../gateway/schemas/shipments';
import { fromGateway, type DataResult } from '../source';
import { toShipmentSummary, type ShipmentSummary } from './summary';

export async function fetchShipmentSummary(
  token: string | null,
): Promise<DataResult<ShipmentSummary>> {
  const result = await gatewayFetch('/api/v1/shipments/stats', {
    schema: ShipmentStatsSchema,
    token,
  });
  return fromGateway(result.ok ? { ...result, data: toShipmentSummary(result.data) } : result);
}

export const gatewayShipmentService = {
  async getSummary() {
    return fetchShipmentSummary(await merchantCredential('shipments'));
  },
};
