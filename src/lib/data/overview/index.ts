import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway, fromMock, resolveDataSource, type DataResult } from '../source';

export interface Overview {
  ordersToday: number;
  ordersChangePercent: number;
  revenueTodayPaise: number;
  revenueChangePercent: number;
  averageShippingPaise: number;
  minimumShippingPaise: number;
  deliveriesToday: number;
  deliveriesChangePercent: number;
  ndr: { open: number; reattempted: number; delivered: number; returned: number };
}

const SAMPLE: Overview = {
  ordersToday: 24,
  ordersChangePercent: 12,
  revenueTodayPaise: 1845000,
  revenueChangePercent: 8,
  averageShippingPaise: 6800,
  minimumShippingPaise: 4200,
  deliveriesToday: 17,
  deliveriesChangePercent: 5,
  ndr: { open: 6, reattempted: 3, delivered: 2, returned: 1 },
};

interface OverviewService {
  getOverview(): Promise<DataResult<Overview>>;
}

const mockOverviewService: OverviewService = {
  async getOverview() {
    return fromMock(SAMPLE);
  },
};

const todaySchema = z.object({
  orders_today: z.number(),
  orders_change_percent: z.number(),
  order_value_today_paise: z.number(),
  order_value_change_percent: z.number(),
  delivered_today: z.number(),
  delivered_change_percent: z.number(),
  average_shipping_paise: z.number(),
  minimum_shipping_paise: z.number(),
  ndr: z.object({
    open: z.number(),
    reattempted: z.number(),
    delivered: z.number(),
    returned: z.number(),
  }),
});

/** Today against yesterday, the 30-day shipping charge and NDR outcomes, from /api/v1/analytics/today. */
const gatewayOverviewService: OverviewService = {
  async getOverview() {
    const result = await gatewayFetch('/api/v1/analytics/today', {
      schema: todaySchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              ordersToday: result.data.orders_today,
              ordersChangePercent: result.data.orders_change_percent,
              revenueTodayPaise: result.data.order_value_today_paise,
              revenueChangePercent: result.data.order_value_change_percent,
              averageShippingPaise: result.data.average_shipping_paise,
              minimumShippingPaise: result.data.minimum_shipping_paise,
              deliveriesToday: result.data.delivered_today,
              deliveriesChangePercent: result.data.delivered_change_percent,
              ndr: result.data.ndr,
            },
          }
        : result,
    );
  },
};

export function overviewService(): OverviewService {
  return resolveDataSource('overview') === 'gateway' ? gatewayOverviewService : mockOverviewService;
}
