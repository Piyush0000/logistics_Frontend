import 'server-only';

import type { CarrierName } from '@logicore/contracts';
import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import { PREFERENCES, type CourierRulesService } from './types';

const rulesSchema = z.object({
  preference: z.enum(PREFERENCES),
  priority: z.array(z.string()),
  disabled: z.array(z.string()),
});
const toRules = (r: z.infer<typeof rulesSchema>) => ({
  preference: r.preference,
  priority: r.priority as CarrierName[],
  disabled: r.disabled as CarrierName[],
});

/** Courier rules from /api/v1/courier-rules: booking follows them for this merchant. */
export const gatewayCourierRulesService: CourierRulesService = {
  async get() {
    const result = await gatewayFetch('/api/v1/courier-rules', {
      schema: rulesSchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: toRules(result.data) } : result);
  },

  async save(rules) {
    const result = await gatewayFetch('/api/v1/courier-rules', {
      method: 'PUT',
      schema: rulesSchema,
      token: await merchantCredential('shipments'),
      body: rules,
    });
    return fromGateway(result.ok ? { ...result, data: toRules(result.data) } : result);
  },
};
