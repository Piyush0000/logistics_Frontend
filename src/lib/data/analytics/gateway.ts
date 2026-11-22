import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { AnalyticsService } from './types';

const points = z.array(z.object({ day: z.string(), value: z.number() }));

/** Daily charts from /api/v1/analytics: deliveries from order-engine, money from the ledger. */
export const gatewayAnalyticsService: AnalyticsService = {
  async deliveredByDay(days) {
    const result = await gatewayFetch('/api/v1/analytics/delivered', {
      schema: z.object({ items: points }),
      token: await merchantCredential('shipments'),
      query: { days },
    });
    return fromGateway(result.ok ? { ...result, data: result.data.items } : result);
  },

  async revenueByDay(days) {
    const result = await gatewayFetch('/api/v1/analytics/revenue', {
      schema: z.object({ freight: points, cod: points }),
      token: await merchantCredential('shipments'),
      query: { days },
    });
    return fromGateway(
      result.ok ? { ...result, data: { freightPaise: result.data.freight, codPaise: result.data.cod } } : result,
    );
  },
};
