import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminMerchantsService } from './gateway';
import { mockAdminMerchantsService } from './mock';
import type { AdminMerchantsService } from './types';

export * from './types';
export { resetMockMerchants } from './mock';

/** Sample data by default; DATA_SOURCE_ADMIN_MERCHANTS=gateway switches to the backend. */
export function adminMerchantsService(): AdminMerchantsService {
  return resolveDataSource('admin_merchants') === 'gateway' ? gatewayAdminMerchantsService : mockAdminMerchantsService;
}
