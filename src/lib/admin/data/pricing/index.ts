import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminPricingService } from './gateway';
import { mockAdminPricingService } from './mock';
import type { AdminPricingService } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_PRICING=gateway switches to the backend. */
export function adminPricingService(): AdminPricingService {
  return resolveDataSource('admin_pricing') === 'gateway' ? gatewayAdminPricingService : mockAdminPricingService;
}
