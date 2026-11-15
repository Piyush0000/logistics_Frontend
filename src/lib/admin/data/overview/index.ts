import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminOverviewService } from './gateway';
import { mockAdminOverviewService } from './mock';
import type { AdminOverviewService } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_OVERVIEW=gateway switches to the backend. */
export function adminOverviewService(): AdminOverviewService {
  return resolveDataSource('admin_overview') === 'gateway' ? gatewayAdminOverviewService : mockAdminOverviewService;
}
