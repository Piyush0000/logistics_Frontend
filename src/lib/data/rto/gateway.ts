import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { ShipmentStatsSchema } from '../../gateway/schemas/shipments';
import { fetchOrdersList } from '../orders/gateway';
import { fromGateway } from '../source';
import { RTO_PAGE_SIZE, RTO_STAGE_STATUS, type RtoService } from './types';

// Both counts and both lists come from the shipments routes. The gateway has no RTO charges
// figure, so that is null and the screen says so.
export const gatewayRtoService: RtoService = {
  async getSummary() {
    const result = await gatewayFetch('/api/v1/shipments/stats', {
      schema: ShipmentStatsSchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              inProgress: result.data.RTO_INITIATED,
              delivered: result.data.RTO_DELIVERED,
              rtoChargesPaise: null,
            },
          }
        : result,
    );
  },

  async listRto({ stage, page }) {
    return fetchOrdersList(
      { status: RTO_STAGE_STATUS[stage], page, limit: RTO_PAGE_SIZE },
      await merchantCredential('shipments'),
    );
  },
};
